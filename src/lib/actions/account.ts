"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { rateLimit } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";
import { createAuthClient } from "@/lib/supabase/server";
import { addressSchema, saveAddress } from "@/lib/addresses";
import { getAddresses, getViewer } from "@/lib/viewer";

type FormResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fields?: string[]; values?: Record<string, string> }
  | null;

/**
 * React resets a form after its action runs; send the typed values back on errors
 * (never passwords) so the form can be refilled instead of wiped.
 */
function keepValues(fd: FormData, r: FormResult): FormResult {
  if (!r || r.ok) return r;
  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.includes("password") && !k.startsWith("$")) values[k] = v;
  return { ...r, values };
}

const loc = (fd: FormData): Locale => {
  const l = String(fd.get("locale") ?? "");
  return isLocale(l) ? l : "id";
};

/** Only same-site relative paths, so `next` can't be abused as an open redirect. */
const safeNext = (value: FormDataEntryValue | null) => {
  const n = String(value ?? "");
  return n.startsWith("/") && !n.startsWith("//") ? n : null;
};

// ------------------------------------------------------------------ sign in / up / out

export async function signInAction(_: FormResult, fd: FormData): Promise<FormResult> {
  return keepValues(fd, await signInImpl(fd));
}

async function signInImpl(fd: FormData): Promise<FormResult> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  // Per account against password guessing, plus a loose per-IP cap.
  if (!(await rateLimit("login", 10, 900, email)) || !(await rateLimit("login-ip", 60, 900)))
    return { ok: false, error: "rateLimit" };
  const password = String(fd.get("password") ?? "");
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, error: "invalidCredentials" };

  const userId = data.user.id;
  const next = safeNext(fd.get("next"));
  const [staff] = await db.select().from(schema.staff).where(eq(schema.staff.userId, userId));
  if (staff?.active) redirect(next?.startsWith("/admin") ? next : "/admin");
  if (next?.startsWith("/admin")) {
    // A customer account tried to open the dashboard.
    await supabase.auth.signOut();
    return { ok: false, error: "notStaff" };
  }

  // Accounts created before the profile existed (or by an admin) get one now.
  const meta = data.user.user_metadata ?? {};
  await db
    .insert(schema.customers)
    .values({ userId, name: String(meta.name ?? email.split("@")[0]), phone: String(meta.phone ?? "") })
    .onConflictDoNothing();
  redirect(next ?? `/${loc(fd)}/account`);
}

const signUpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200),
  phone: z.string().transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: "phone" });
    return p ?? "";
  }),
  password: z.string().min(8).max(72),
});

export async function signUpAction(_: FormResult, fd: FormData): Promise<FormResult> {
  return keepValues(fd, await signUpImpl(fd));
}

async function signUpImpl(fd: FormData): Promise<FormResult> {
  if (!(await rateLimit("signup", 20, 3600))) return { ok: false, error: "rateLimit" };
  const p = signUpSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: "validation", fields: [...new Set(p.error.issues.map((i) => String(i.path[0])))] };
  const locale = loc(fd);
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email: p.data.email.toLowerCase(),
    password: p.data.password,
    options: {
      data: { name: p.data.name, phone: p.data.phone },
      emailRedirectTo: `${siteUrl}/api/auth/callback?next=/${locale}/account`,
    },
  });
  if (error) return { ok: false, error: error.code === "user_already_exists" ? "emailTaken" : error.code === "weak_password" ? "weakPassword" : "generic" };
  // Supabase hides existing emails behind a fake user with no identities.
  if (data.user && data.user.identities?.length === 0) return { ok: false, error: "emailTaken" };
  if (!data.user) return { ok: false, error: "generic" };

  await db
    .insert(schema.customers)
    .values({ userId: data.user.id, name: p.data.name, phone: p.data.phone })
    .onConflictDoNothing();

  if (!data.session) return { ok: true, message: "checkEmail" }; // email confirmation is on
  redirect(safeNext(fd.get("next")) ?? `/${locale}/account`);
}

export async function signOutAction(fd: FormData) {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect(`/${loc(fd)}`);
}

export async function forgotPasswordAction(_: FormResult, fd: FormData): Promise<FormResult> {
  return keepValues(fd, await forgotPasswordImpl(fd));
}

async function forgotPasswordImpl(fd: FormData): Promise<FormResult> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!(await rateLimit("forgot", 3, 3600, email)) || !(await rateLimit("forgot-ip", 20, 3600)))
    return { ok: false, error: "rateLimit" };
  if (!z.email().safeParse(email).success) return { ok: false, error: "validation", fields: ["email"] };
  const supabase = await createAuthClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/api/auth/callback?next=/${loc(fd)}/account/password`,
  });
  // Same answer whether or not the account exists.
  return { ok: true, message: "resetSent" };
}

export async function updatePasswordAction(_: FormResult, fd: FormData): Promise<FormResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "notSignedIn" };
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { ok: false, error: "validation", fields: ["password"] };
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.code === "same_password" ? "samePassword" : "generic" };
  return { ok: true, message: "passwordUpdated" };
}

// ------------------------------------------------------------------ profile & addresses

async function requireCustomer() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Not signed in");
  if (!viewer.customer) {
    await db.insert(schema.customers).values({ userId: viewer.userId, name: viewer.staff?.name ?? viewer.email.split("@")[0] }).onConflictDoNothing();
  }
  return viewer;
}

export async function saveProfileAction(_: FormResult, fd: FormData): Promise<FormResult> {
  return keepValues(fd, await saveProfileImpl(fd));
}

async function saveProfileImpl(fd: FormData): Promise<FormResult> {
  const viewer = await requireCustomer();
  const p = z
    .object({
      name: z.string().trim().min(2).max(80),
      phone: z.string().transform((v, ctx) => {
        const n = normalizePhone(v);
        if (!n) ctx.addIssue({ code: "custom", message: "phone" });
        return n ?? "";
      }),
    })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: "validation", fields: [...new Set(p.error.issues.map((i) => String(i.path[0])))] };
  await db.update(schema.customers).set({ ...p.data, updatedAt: new Date() }).where(eq(schema.customers.userId, viewer.userId));
  refresh();
  return { ok: true, message: "saved" };
}

export async function saveAddressAction(_: FormResult, fd: FormData): Promise<FormResult> {
  return keepValues(fd, await saveAddressImpl(fd));
}

async function saveAddressImpl(fd: FormData): Promise<FormResult> {
  const viewer = await requireCustomer();
  const p = addressSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: "validation", fields: [...new Set(p.error.issues.map((i) => String(i.path[0])))] };
  await saveAddress(viewer.userId, p.data);
  refresh();
  return { ok: true, message: "saved" };
}

export async function deleteAddressAction(id: string) {
  const viewer = await requireCustomer();
  if (!z.uuid().safeParse(id).success) return;
  const [deleted] = await db
    .delete(schema.customerAddresses)
    .where(and(eq(schema.customerAddresses.id, id), eq(schema.customerAddresses.userId, viewer.userId)))
    .returning();
  if (deleted?.isDefault) {
    const [next] = await getAddresses(viewer.userId);
    if (next) await db.update(schema.customerAddresses).set({ isDefault: true }).where(eq(schema.customerAddresses.id, next.id));
  }
  refresh();
}

export async function setDefaultAddressAction(id: string) {
  const viewer = await requireCustomer();
  if (!z.uuid().safeParse(id).success) return;
  await db.transaction(async (tx) => {
    await tx.update(schema.customerAddresses).set({ isDefault: false }).where(eq(schema.customerAddresses.userId, viewer.userId));
    await tx
      .update(schema.customerAddresses)
      .set({ isDefault: true })
      .where(and(eq(schema.customerAddresses.id, id), eq(schema.customerAddresses.userId, viewer.userId)));
  });
  refresh();
}

/** Prefill data for the checkout form (null for guests). */
export async function getCheckoutProfileAction() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const addresses = await getAddresses(viewer.userId);
  return {
    name: viewer.customer?.name ?? viewer.staff?.name ?? "",
    email: viewer.email,
    phone: viewer.customer?.phone ?? "",
    addresses: addresses.map((a) => ({
      id: a.id,
      label: a.label,
      recipient: a.recipient,
      phone: a.phone,
      line: a.line,
      district: a.district,
      city: a.city,
      province: a.province,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    })),
  };
}
