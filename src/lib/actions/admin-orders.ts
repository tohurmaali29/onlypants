"use server";

import { after } from "next/server";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notifyOrder } from "@/lib/notify";
import type { OrderEvent } from "@/lib/notify/templates";
import {
  approvePayment,
  cancelOrder,
  markCompleted,
  markProcessing,
  quoteShipping,
  rejectPayment,
  TransitionError,
  updateTracking,
} from "@/lib/orders/service";
import { AssignedToOtherError, recordPacking, recordShipping, takeOver } from "@/lib/orders/fulfillment";
import { createServiceClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string; assignedTo?: string };

const id = z.uuid();

/** Shared wrapper: auth, error mapping, audit, cache + router refresh, notifications. */
async function run(
  action: string,
  orderId: string,
  fn: (actorId: string) => Promise<{ order: typeof schema.orders.$inferSelect; event?: OrderEvent; note?: string; stock?: boolean }>,
  data: object = {},
): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!id.safeParse(orderId).success) return { ok: false, error: "ID pesanan tidak valid" };
  try {
    const res = await fn(staff.id);
    await audit(staff.id, action, "order", orderId, data);
    if (res.stock) updateTag(CATALOG_TAG);
    if (res.event) after(() => notifyOrder(res.event!, res.order, { note: res.note }));
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof AssignedToOtherError) {
      const [s] = await db.select({ name: schema.staff.name }).from(schema.staff).where(eq(schema.staff.userId, e.assigneeId));
      return { ok: false, error: `Pesanan ini sedang dipegang ${s?.name ?? "staff lain"}.`, assignedTo: s?.name ?? "staff lain" };
    }
    if (e instanceof TransitionError) return { ok: false, error: e.message === "Upload packing proof first" ? "Upload bukti packing dulu." : "Status pesanan sudah berubah. Muat ulang halaman." };
    console.error(action, e);
    return { ok: false, error: "Terjadi kesalahan. Coba lagi." };
  }
}

export async function setShippingAction(orderId: string, input: { cost: number; courier: string }) {
  const p = z.object({ cost: z.number().int().min(0).max(5_000_000), courier: z.string().trim().min(2).max(60) }).safeParse(input);
  if (!p.success) return { ok: false, error: "Isi ongkir (angka) dan kurir." } as ActionResult;
  return run("order.quote", orderId, async (actor) => {
    const order = await quoteShipping(orderId, p.data.cost, p.data.courier, actor);
    return { order, event: "quoted" };
  }, p.data);
}

export async function approvePaymentAction(orderId: string) {
  return run("order.approve", orderId, async (actor) => ({ order: await approvePayment(orderId, actor), event: "approved", stock: true }));
}

export async function rejectPaymentAction(orderId: string, note: string) {
  const reason = note.trim().slice(0, 200);
  if (reason.length < 3) return { ok: false, error: "Tulis alasan penolakan." } as ActionResult;
  return run("order.reject", orderId, async (actor) => ({
    order: await rejectPayment(orderId, reason, actor),
    event: "rejected",
    note: reason,
  }), { reason });
}

export async function markProcessingAction(orderId: string) {
  return run("order.processing", orderId, async (actor) => ({ order: await markProcessing(orderId, actor) }));
}

export async function updateTrackingAction(orderId: string, input: { tracking: string; courier: string }) {
  const p = z.object({ tracking: z.string().trim().min(4).max(60), courier: z.string().trim().min(2).max(60) }).safeParse(input);
  if (!p.success) return { ok: false, error: "Isi kurir dan nomor resi." } as ActionResult;
  return run("order.tracking", orderId, async (actor) => ({
    order: await updateTracking(orderId, p.data.tracking, p.data.courier, actor),
    event: "shipped",
  }), p.data);
}

export async function takeOverAction(orderId: string) {
  return run("order.takeover", orderId, async (actor) => ({ order: await takeOver(orderId, actor) }));
}

const proofSchema = z.object({
  photos: z.array(z.string().regex(/^[0-9a-f-]{36}\/(packing|shipping)-\d+-[a-z0-9]+\.jpg$/)).min(1, "photos").max(6),
  note: z.string().trim().max(500),
  takeOver: z.boolean(),
});

export async function packingAction(orderId: string, input: z.input<typeof proofSchema>) {
  const p = proofSchema.safeParse(input);
  if (!p.success || !p.data.photos.every((x) => x.startsWith(`${orderId}/packing-`)))
    return { ok: false, error: "Upload minimal 1 foto packing." } as ActionResult;
  return run("order.packed", orderId, async (actor) => ({ order: (await recordPacking(orderId, actor, p.data)).order }), {
    photos: p.data.photos.length,
    takeOver: p.data.takeOver,
  });
}

export async function shippingAction(orderId: string, input: z.input<typeof proofSchema> & { tracking: string; courier: string }) {
  const p = proofSchema
    .extend({ tracking: z.string().trim().min(4).max(60), courier: z.string().trim().min(2).max(60) })
    .safeParse(input);
  if (!p.success || !p.data.photos.every((x) => x.startsWith(`${orderId}/shipping-`)))
    return { ok: false, error: "Isi kurir, nomor resi, dan minimal 1 foto pengiriman." } as ActionResult;
  const { tracking, courier, ...proof } = p.data;
  return run("order.ship", orderId, async (actor) => ({
    order: (await recordShipping(orderId, actor, { ...proof, trackingNumber: tracking, courier })).order,
    event: "shipped",
  }), { tracking, courier, takeOver: proof.takeOver });
}

/** Signed upload slot for a packing/shipping photo (compressed to JPEG in the browser). */
export async function createFulfillmentUploadAction(orderId: string, stage: "packing" | "shipping", size: number) {
  await requireStaff();
  if (!id.safeParse(orderId).success || !["packing", "shipping"].includes(stage) || size > 5 * 1024 * 1024)
    return { ok: false as const, error: "Foto terlalu besar" };
  const path = `${orderId}/${stage}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { data, error } = await createServiceClient().storage.from("fulfillment-photos").createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Gagal menyiapkan upload" };
  return { ok: true as const, path, token: data.token };
}

export async function markCompletedAction(orderId: string) {
  return run("order.complete", orderId, async (actor) => ({ order: await markCompleted(orderId, actor) }));
}

export async function cancelOrderAction(orderId: string, input: { reason: string; restock: boolean }) {
  const reason = input.reason.trim().slice(0, 200);
  if (reason.length < 3) return { ok: false, error: "Tulis alasan pembatalan." } as ActionResult;
  return run("order.cancel", orderId, async (actor) => ({
    order: await cancelOrder(orderId, reason, actor, input.restock),
    event: "cancelled",
    note: reason,
    stock: true,
  }), input);
}

export async function saveInternalNoteAction(orderId: string, note: string) {
  const staff = await requireStaff();
  if (!id.safeParse(orderId).success) return { ok: false, error: "ID tidak valid" } as ActionResult;
  await db.update(schema.orders).set({ internalNote: note.slice(0, 2000) }).where(eq(schema.orders.id, orderId));
  await audit(staff.id, "order.note", "order", orderId);
  refresh();
  return { ok: true } as ActionResult;
}

/** Short-lived link to view a private payment proof. */
export async function proofUrlAction(path: string) {
  await requireStaff();
  if (!/^[0-9a-f-]{36}\/\d+\.(jpg|png|webp|pdf)$/.test(path)) return null;
  const { data } = await createServiceClient().storage.from("payment-proofs").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
