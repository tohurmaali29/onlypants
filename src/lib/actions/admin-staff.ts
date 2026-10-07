"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { createServiceClient } from "@/lib/supabase/server";

type Result = { ok: true; password?: string } | { ok: false; error: string };

const tempPassword = () => randomBytes(9).toString("base64url");

export async function addStaffAction(input: { name: string; email: string; role: "owner" | "staff" }): Promise<Result> {
  const owner = await requireStaff("owner");
  const p = z
    .object({ name: z.string().trim().min(2).max(60), email: z.email().toLowerCase(), role: z.enum(["owner", "staff"]) })
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Isi nama dan email yang valid" };
  const password = tempPassword();
  const { data, error } = await createServiceClient().auth.admin.createUser({
    email: p.data.email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) return { ok: false, error: error?.message.includes("already") ? "Email sudah terdaftar" : "Gagal membuat akun" };
  await db.insert(schema.staff).values({ userId: data.user.id, name: p.data.name, email: p.data.email, role: p.data.role });
  await audit(owner.id, "staff.add", "staff", data.user.id, { email: p.data.email, role: p.data.role });
  refresh();
  return { ok: true, password };
}

export async function updateStaffAction(userId: string, patch: { role?: "owner" | "staff"; active?: boolean }): Promise<Result> {
  const owner = await requireStaff("owner");
  if (userId === owner.id) return { ok: false, error: "Tidak bisa mengubah akun sendiri" };
  const p = z.object({ role: z.enum(["owner", "staff"]).optional(), active: z.boolean().optional() }).safeParse(patch);
  if (!p.success) return { ok: false, error: "Data tidak valid" };
  await db.update(schema.staff).set(p.data).where(eq(schema.staff.userId, userId));
  if (p.data.active === false) {
    // Revoke existing sessions so a deactivated account is out immediately.
    await createServiceClient().auth.admin.signOut(userId).catch(() => {});
  }
  await audit(owner.id, "staff.update", "staff", userId, p.data);
  refresh();
  return { ok: true };
}

export async function resetStaffPasswordAction(userId: string): Promise<Result> {
  const owner = await requireStaff("owner");
  const password = tempPassword();
  const { error } = await createServiceClient().auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: "Gagal reset password" };
  await audit(owner.id, "staff.reset_password", "staff", userId);
  return { ok: true, password };
}

export async function changeOwnPasswordAction(password: string): Promise<Result> {
  const me = await requireStaff();
  if (password.length < 10) return { ok: false, error: "Password minimal 10 karakter" };
  const { error } = await createServiceClient().auth.admin.updateUserById(me.id, { password });
  if (error) return { ok: false, error: "Gagal mengganti password" };
  await audit(me.id, "staff.change_password", "staff", me.id);
  return { ok: true };
}
