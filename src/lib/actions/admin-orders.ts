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
  markShipped,
  quoteShipping,
  rejectPayment,
  TransitionError,
} from "@/lib/orders/service";
import { createServiceClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

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
    if (e instanceof TransitionError) return { ok: false, error: "Status pesanan sudah berubah. Muat ulang halaman." };
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

export async function markShippedAction(orderId: string, input: { tracking: string; courier: string }) {
  const p = z.object({ tracking: z.string().trim().min(4).max(60), courier: z.string().trim().min(2).max(60) }).safeParse(input);
  if (!p.success) return { ok: false, error: "Isi kurir dan nomor resi." } as ActionResult;
  return run("order.ship", orderId, async (actor) => ({
    order: await markShipped(orderId, p.data.tracking, p.data.courier, actor),
    event: "shipped",
  }), p.data);
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
