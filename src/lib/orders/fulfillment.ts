import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema, type Tx } from "@/lib/db";
import { TransitionError } from "./service";

const { orders, fulfillmentSteps, orderEvents } = schema;

/** Someone else is handling this order; the caller must confirm a take-over. */
export class AssignedToOtherError extends Error {
  constructor(public readonly assigneeId: string) {
    super("Order is handled by another staff member");
  }
}

type Proof = { photos: string[]; note: string; takeOver: boolean };

async function lockOrder(tx: Tx, orderId: string) {
  const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  if (!o) throw new TransitionError("Order not found");
  return o;
}

function guardAssignee(order: { assigneeId: string | null }, actorId: string, takeOver: boolean) {
  if (order.assigneeId && order.assigneeId !== actorId && !takeOver) throw new AssignedToOtherError(order.assigneeId);
}

async function lastStep(tx: Tx, orderId: string, stage: "packing" | "shipping") {
  const [s] = await tx
    .select()
    .from(fulfillmentSteps)
    .where(and(eq(fulfillmentSteps.orderId, orderId), eq(fulfillmentSteps.stage, stage)))
    .orderBy(desc(fulfillmentSteps.createdAt))
    .limit(1);
  return s;
}

/** Become the PIC of a paid/processing order without doing a step yet. */
export async function takeOver(orderId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (!["paid", "processing"].includes(o.status)) throw new TransitionError("Only orders being fulfilled can be taken over");
    if (o.assigneeId === actorId) return o;
    const [updated] = await tx.update(orders).set({ assigneeId: actorId, updatedAt: new Date() }).where(eq(orders.id, orderId)).returning();
    await tx.insert(orderEvents).values({ orderId, message: `taken over from ${o.assigneeId ?? "-"}`, actorId });
    return updated;
  });
}

/**
 * Packing proof. `tookOverFrom` records whoever had claimed the order when a
 * different person ends up packing it (via an earlier or inline take-over).
 */
export async function recordPacking(orderId: string, actorId: string, proof: Proof) {
  return db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (o.status !== "processing") throw new TransitionError("Start packing first");
    guardAssignee(o, actorId, proof.takeOver);
    const tookOverFrom = o.claimedBy && o.claimedBy !== actorId ? o.claimedBy : null;
    const [step] = await tx
      .insert(fulfillmentSteps)
      .values({ orderId, stage: "packing", actorId, tookOverFrom, photos: proof.photos, note: proof.note })
      .returning();
    const [updated] = await tx.update(orders).set({ assigneeId: actorId, updatedAt: new Date() }).where(eq(orders.id, orderId)).returning();
    await tx.insert(orderEvents).values({ orderId, message: tookOverFrom ? `packed (taken over from ${tookOverFrom})` : "packed", actorId });
    return { order: updated, step };
  });
}

/**
 * Hand-off to the courier. Requires packing proof; `tookOverFrom` is the packer
 * when someone else ships.
 */
export async function recordShipping(orderId: string, actorId: string, proof: Proof & { trackingNumber: string; courier: string }) {
  return db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (o.status !== "processing") throw new TransitionError("Order is not being packed");
    const packing = await lastStep(tx, orderId, "packing");
    if (!packing) throw new TransitionError("Upload packing proof first");
    guardAssignee(o, actorId, proof.takeOver);
    const tookOverFrom = packing.actorId !== actorId ? packing.actorId : null;
    const [step] = await tx
      .insert(fulfillmentSteps)
      .values({ orderId, stage: "shipping", actorId, tookOverFrom, photos: proof.photos, note: proof.note })
      .returning();
    const [updated] = await tx
      .update(orders)
      .set({
        status: "shipped",
        trackingNumber: proof.trackingNumber,
        courier: proof.courier,
        shippedAt: new Date(),
        assigneeId: actorId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();
    await tx.insert(orderEvents).values({
      orderId,
      status: "shipped",
      message: `shipped: ${proof.courier} ${proof.trackingNumber}${tookOverFrom ? ` (taken over from ${tookOverFrom})` : ""}`,
      actorId,
    });
    return { order: updated, step };
  });
}

export async function getFulfillmentSteps(orderId: string) {
  return db.select().from(fulfillmentSteps).where(eq(fulfillmentSteps.orderId, orderId)).orderBy(asc(fulfillmentSteps.createdAt));
}
