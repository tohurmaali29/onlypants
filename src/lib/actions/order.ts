"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { notifyOrder } from "@/lib/notify";
import { orderAccessKey } from "@/lib/orders/codes";
import { findOrderByContact, findOrderByKey, recordPaymentProof, TransitionError } from "@/lib/orders/service";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

const fileSchema = z.object({
  code: z.string().max(20),
  key: z.string().max(64),
  type: z.string(),
  size: z.number().int().positive().max(MAX_BYTES),
});

/** Step 1 of a proof upload: a short-lived signed URL the browser uploads to directly. */
export async function createProofUpload(input: z.input<typeof fileSchema>) {
  const p = fileSchema.safeParse(input);
  if (!p.success || !TYPES[p.data.type]) return { ok: false as const, error: "file" };
  if (!(await rateLimit("proof", 10, 600))) return { ok: false as const, error: "rateLimit" };
  const order = await findOrderByKey(p.data.code, p.data.key);
  if (!order) return { ok: false as const, error: "notFound" };
  if (!["awaiting_payment", "payment_review"].includes(order.status)) return { ok: false as const, error: "status" };

  const path = `${order.id}/${Date.now()}.${TYPES[p.data.type]}`;
  const { data, error } = await createServiceClient().storage.from("payment-proofs").createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "generic" };
  return { ok: true as const, path, token: data.token };
}

/** Step 2: the file is in storage; attach it to the order and alert the admin. */
export async function confirmProofUpload(input: { code: string; key: string; path: string }) {
  const order = await findOrderByKey(input.code, input.key);
  if (!order || !input.path.startsWith(`${order.id}/`)) return { ok: false as const, error: "notFound" };

  // Make sure the upload really happened and respects the size limit.
  const storage = createServiceClient().storage.from("payment-proofs");
  const folder = input.path.split("/")[0];
  const name = input.path.split("/")[1];
  const { data: files } = await storage.list(folder, { search: name });
  const file = files?.find((f) => f.name === name);
  if (!file || (file.metadata?.size ?? 0) > MAX_BYTES) return { ok: false as const, error: "file" };

  try {
    const updated = await recordPaymentProof(order.id, input.path);
    after(() => notifyOrder("proof_uploaded", updated));
    return { ok: true as const };
  } catch (e) {
    if (e instanceof TransitionError) return { ok: false as const, error: "status" };
    throw e;
  }
}

/** "Cek pesanan" form. */
export async function trackOrder(_: unknown, fd: FormData) {
  const locale = fd.get("locale") === "en" ? "en" : "id";
  const code = String(fd.get("code") ?? "").slice(0, 20);
  const contact = String(fd.get("contact") ?? "").slice(0, 200);
  if (!(await rateLimit("track", 15, 600))) return { error: "rateLimit" as const };
  const order = await findOrderByContact(code, contact);
  if (!order) return { error: "notFound" as const };
  redirect(`/${locale}/order/${order.code}?k=${orderAccessKey(order.code)}`);
}
