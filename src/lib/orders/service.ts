import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/lib/db";
import type { Address, OrderStatus } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { hashToken, newOrderCode, orderAccessKey, pickUniqueCode, verifyAccessKey } from "./codes";

const { orders, orderItems, orderEvents, variants, products, productImages, stockMovements, paymentProofs } = schema;

export class StockError extends Error {
  constructor(public readonly items: string[]) {
    super(`Insufficient stock: ${items.join(", ")}`);
  }
}
export class TransitionError extends Error {}

const HOLDING: OrderStatus[] = ["awaiting_quote", "awaiting_payment", "payment_review"];

function event(tx: Tx, orderId: string, status: OrderStatus | null, message: string, actorId?: string | null) {
  return tx.insert(orderEvents).values({ orderId, status, message, actorId: actorId ?? null });
}

/** Guarded status change: fails if the order is no longer in one of `from`. */
async function transition(
  tx: Tx,
  orderId: string,
  from: OrderStatus[],
  set: Partial<typeof orders.$inferInsert>,
) {
  const rows = await tx
    .update(orders)
    .set({ ...set, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), inArray(orders.status, from)))
    .returning();
  if (rows.length === 0) throw new TransitionError(`Order ${orderId} is not in ${from.join("/")}`);
  return rows[0];
}

// ------------------------------------------------------------------ customer

export type PlaceOrderInput = {
  customerId?: string | null;
  locale: "id" | "en";
  customerName: string;
  email: string;
  phone: string;
  address: Address;
  note: string;
  items: { variantId: string; qty: number }[];
};

/**
 * Creates an order and reserves stock atomically. Each reservation is a
 * conditional UPDATE, so concurrent checkouts for the last unit serialize on the
 * row lock and only one of them succeeds.
 */
export async function placeOrder(input: PlaceOrderInput) {
  const { timeouts } = await getSettings();
  const lines = new Map<string, number>();
  for (const i of input.items) lines.set(i.variantId, (lines.get(i.variantId) ?? 0) + i.qty);

  const order = await db.transaction(async (tx) => {
    const info = await tx
      .select({
        variantId: variants.id,
        productId: products.id,
        sizeLabel: variants.sizeLabel,
        price: products.price,
        nameId: products.nameId,
        nameEn: products.nameEn,
        status: products.status,
      })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(inArray(variants.id, [...lines.keys()]));

    const short: string[] = [];
    for (const [variantId, qty] of lines) {
      const v = info.find((x) => x.variantId === variantId);
      if (!v || v.status !== "active") {
        short.push(variantId);
        continue;
      }
      const ok = await tx
        .update(variants)
        .set({ reserved: sql`${variants.reserved} + ${qty}` })
        .where(and(eq(variants.id, variantId), sql`${variants.stockOnHand} - ${variants.reserved} >= ${qty}`))
        .returning({ id: variants.id });
      if (ok.length === 0) short.push(input.locale === "en" ? v.nameEn : v.nameId);
    }
    if (short.length) throw new StockError(short);

    const images = await tx
      .select({ productId: productImages.productId, url: productImages.url })
      .from(productImages)
      .where(and(inArray(productImages.productId, info.map((i) => i.productId)), eq(productImages.sort, 0)));

    const subtotal = info.reduce((n, v) => n + v.price * (lines.get(v.variantId) ?? 0), 0);
    const now = new Date();

    let created: typeof orders.$inferSelect | undefined;
    for (let attempt = 0; !created; attempt++) {
      const code = newOrderCode(now);
      const rows = await tx
        .insert(orders)
        .values({
          code,
          accessTokenHash: hashToken(orderAccessKey(code)),
          customerId: input.customerId ?? null,
          locale: input.locale,
          customerName: input.customerName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          note: input.note,
          subtotal,
          quoteDeadline: new Date(now.getTime() + timeouts.quote_hours * 3600_000),
        })
        .onConflictDoNothing({ target: orders.code })
        .returning();
      created = rows[0];
      if (!created && attempt > 5) throw new Error("Could not allocate an order code");
    }

    await tx.insert(orderItems).values(
      info.map((v) => ({
        orderId: created!.id,
        variantId: v.variantId,
        productId: v.productId,
        productName: v.nameId,
        sizeLabel: v.sizeLabel,
        imageUrl: images.find((i) => i.productId === v.productId)?.url ?? null,
        unitPrice: v.price,
        qty: lines.get(v.variantId)!,
      })),
    );
    await tx.insert(stockMovements).values(
      info.map((v) => ({
        variantId: v.variantId,
        type: "reserve" as const,
        qty: lines.get(v.variantId)!,
        orderId: created!.id,
        note: "checkout",
      })),
    );
    await event(tx, created.id, "awaiting_quote", "order placed");
    return created;
  });

  return { order, key: orderAccessKey(order.code) };
}

export async function findOrderByKey(code: string, key: string) {
  if (!verifyAccessKey(code, key)) return null;
  const [order] = await db.select().from(orders).where(eq(orders.code, code.toUpperCase()));
  return order ?? null;
}

/** "Cek pesanan": order code + the phone or email used at checkout. */
export async function findOrderByContact(code: string, contact: string) {
  const [order] = await db.select().from(orders).where(eq(orders.code, code.trim().toUpperCase()));
  if (!order) return null;
  const c = contact.trim().toLowerCase();
  const digits = c.replace(/\D/g, "").replace(/^0/, "62");
  const match = order.email.toLowerCase() === c || (digits.length >= 9 && order.phone === digits);
  return match ? order : null;
}

export async function getOrderDetail(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return null;
  const [items, proofs, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
    db.select().from(paymentProofs).where(eq(paymentProofs.orderId, orderId)).orderBy(desc(paymentProofs.createdAt)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId)).orderBy(asc(orderEvents.createdAt)),
  ]);
  return { order, items, proofs, events };
}

export async function recordPaymentProof(orderId: string, storagePath: string) {
  return db.transaction(async (tx) => {
    const order = await transition(tx, orderId, ["awaiting_payment", "payment_review"], { status: "payment_review" });
    // A new upload supersedes any proof still waiting for review.
    await tx
      .update(paymentProofs)
      .set({ status: "rejected", reviewNote: "superseded" })
      .where(and(eq(paymentProofs.orderId, orderId), eq(paymentProofs.status, "pending")));
    await tx.insert(paymentProofs).values({ orderId, storagePath });
    await event(tx, orderId, "payment_review", "payment proof uploaded");
    return order;
  });
}

// ------------------------------------------------------------------ admin

export async function quoteShipping(orderId: string, cost: number, courier: string, actorId: string) {
  const { timeouts } = await getSettings();
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
        if (!current || !["awaiting_quote", "awaiting_payment"].includes(current.status))
          throw new TransitionError("Shipping can only be set before payment");

        let uniqueCode = current.uniqueCode;
        if (!uniqueCode) {
          const taken = await tx
            .select({ c: orders.uniqueCode })
            .from(orders)
            .where(inArray(orders.status, ["awaiting_payment", "payment_review"]));
          uniqueCode = pickUniqueCode(new Set(taken.map((r) => r.c!).filter(Boolean)));
        }
        const now = new Date();
        const first = current.status === "awaiting_quote";
        const updated = await transition(tx, orderId, ["awaiting_quote", "awaiting_payment"], {
          status: "awaiting_payment",
          shippingCost: cost,
          courier,
          uniqueCode,
          total: current.subtotal + cost + uniqueCode,
          shippingQuotedAt: now,
          paymentDeadline: first
            ? new Date(now.getTime() + timeouts.payment_hours * 3600_000)
            : current.paymentDeadline,
        });
        await event(tx, orderId, "awaiting_payment", `shipping set: ${courier} ${cost}`, actorId);
        return updated;
      });
    } catch (e) {
      // Two admins quoting at once can collide on the unique-code index; retry with a fresh code.
      const err = e as { code?: string; cause?: { code?: string } };
      const unique = err.code === "23505" || err.cause?.code === "23505";
      if (unique && attempt < 3) continue;
      throw e;
    }
  }
}

export async function approvePayment(orderId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const res = await tx.execute<{ ok: boolean }>(sql`select commit_order(${orderId}, ${actorId}) as ok`);
    if (!res[0]?.ok) throw new TransitionError("Order is not awaiting payment");
    await tx
      .update(paymentProofs)
      .set({ status: "approved", reviewedBy: actorId, reviewedAt: new Date() })
      .where(and(eq(paymentProofs.orderId, orderId), eq(paymentProofs.status, "pending")));
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    return order;
  });
}

const REJECT_GRACE_MS = 6 * 3600_000;

export async function rejectPayment(orderId: string, note: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    // Give the customer at least a few hours to pay again after a rejection.
    const minDeadline = new Date(Date.now() + REJECT_GRACE_MS);
    const deadline =
      current?.paymentDeadline && current.paymentDeadline > minDeadline ? current.paymentDeadline : minDeadline;
    const order = await transition(tx, orderId, ["payment_review"], {
      status: "awaiting_payment",
      paymentDeadline: deadline,
    });
    await tx
      .update(paymentProofs)
      .set({ status: "rejected", reviewNote: note, reviewedBy: actorId, reviewedAt: new Date() })
      .where(and(eq(paymentProofs.orderId, orderId), eq(paymentProofs.status, "pending")));
    await event(tx, orderId, "awaiting_payment", `payment rejected: ${note}`, actorId);
    return order;
  });
}

/** "Start packing": the actor claims the order and becomes its PIC. */
export async function markProcessing(orderId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const order = await transition(tx, orderId, ["paid"], { status: "processing", claimedBy: actorId, assigneeId: actorId });
    await event(tx, orderId, "processing", "packing", actorId);
    return order;
  });
}

/** Correct the courier / tracking number of an order that has already shipped. */
export async function updateTracking(orderId: string, trackingNumber: string, courier: string, actorId: string) {
  return db.transaction(async (tx) => {
    const order = await transition(tx, orderId, ["shipped"], { trackingNumber, courier });
    await event(tx, orderId, null, `tracking updated: ${courier} ${trackingNumber}`, actorId);
    return order;
  });
}

export async function markCompleted(orderId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const order = await transition(tx, orderId, ["shipped"], { status: "completed", completedAt: new Date() });
    await event(tx, orderId, "completed", "completed", actorId);
    return order;
  });
}

/**
 * Cancel at any non-terminal stage. Unpaid orders release their reservation;
 * paid orders optionally put the items back on the shelf (refund handled outside the app).
 */
export async function cancelOrder(orderId: string, reason: string, actorId: string, restock: boolean) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!current) throw new TransitionError("Order not found");

    if (HOLDING.includes(current.status)) {
      const res = await tx.execute<{ ok: boolean }>(
        sql`select release_order(${orderId}, 'cancelled', ${reason}, ${actorId}) as ok`,
      );
      if (!res[0]?.ok) throw new TransitionError("Order could not be released");
    } else if (current.status === "paid" || current.status === "processing") {
      await transition(tx, orderId, ["paid", "processing"], {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason,
      });
      if (restock) {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        for (const it of items) {
          await tx
            .update(variants)
            .set({ stockOnHand: sql`${variants.stockOnHand} + ${it.qty}` })
            .where(eq(variants.id, it.variantId));
          await tx.insert(stockMovements).values({
            variantId: it.variantId,
            type: "return",
            qty: it.qty,
            orderId,
            actorId,
            note: reason,
          });
        }
      }
      await event(tx, orderId, "cancelled", reason, actorId);
    } else {
      throw new TransitionError(`Cannot cancel a ${current.status} order`);
    }
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    return order;
  });
}

/** Expire overdue orders now (also runs every 10 minutes via pg_cron). */
export async function sweepOrders() {
  const res = await db.execute<{ n: number }>(sql`select sweep_orders() as n`);
  return res[0]?.n ?? 0;
}
