// Runs against the local Supabase database (npm run db:start).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  approvePayment,
  cancelOrder,
  placeOrder,
  quoteShipping,
  recordPaymentProof,
  rejectPayment,
  StockError,
  sweepOrders,
  TransitionError,
  type PlaceOrderInput,
} from "@/lib/orders/service";

const { products, variants, orders, categories, stockMovements } = schema;
const ACTOR = "00000000-0000-4000-8000-0000000000aa";
let thriftVariant = "";
let merchVariant = "";
let productIds: string[] = [];

const customer = (items: PlaceOrderInput["items"]): PlaceOrderInput => ({
  locale: "id",
  customerName: "Test Buyer",
  email: "buyer@example.com",
  phone: "6281234567890",
  address: { line: "Jl. Test 1", district: "Jagakarsa", city: "Jakarta Selatan", province: "DKI Jakarta", postalCode: "12530" },
  note: "",
  items,
});

const variant = async (id: string) => (await db.select().from(variants).where(eq(variants.id, id)))[0];

beforeAll(async () => {
  await db.execute(sql`
    insert into auth.users (id, instance_id, aud, role, email)
    values (${ACTOR}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'itest-actor@onlypants.test')
    on conflict (id) do nothing`);
  await db.execute(sql`
    insert into staff (user_id, name, email, role) values (${ACTOR}, 'Test Actor', 'itest-actor@onlypants.test', 'owner')
    on conflict (user_id) do nothing`);

  const [cat] = await db.select().from(categories).limit(1);
  const created = await db
    .insert(products)
    .values([
      { slug: `itest-thrift-${Date.now()}`, type: "thrift", categoryId: cat.id, nameId: "ITest Thrift", nameEn: "ITest Thrift", price: 100_000, status: "active" },
      { slug: `itest-merch-${Date.now()}`, type: "merch", categoryId: cat.id, nameId: "ITest Merch", nameEn: "ITest Merch", price: 50_000, status: "active" },
    ])
    .returning();
  productIds = created.map((p) => p.id);
  const vs = await db
    .insert(variants)
    .values([
      { productId: created[0].id, sizeLabel: "W30", stockOnHand: 1 },
      { productId: created[1].id, sizeLabel: "M", stockOnHand: 3 },
    ])
    .returning();
  thriftVariant = vs[0].id;
  merchVariant = vs[1].id;
});

afterAll(async () => {
  const vids = [thriftVariant, merchVariant];
  const ord = await db.execute<{ order_id: string }>(
    sql`select distinct order_id from order_items where variant_id in (${sql.join(vids.map((v) => sql`${v}`), sql`, `)})`,
  );
  const ids = ord.map((r) => r.order_id);
  if (ids.length) await db.delete(orders).where(inArray(orders.id, ids));
  await db.delete(products).where(inArray(products.id, productIds));
});

describe("checkout reservation", () => {
  it("sells the last unit to exactly one of many simultaneous buyers", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => placeOrder(customer([{ variantId: thriftVariant, qty: 1 }]))),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed.every((r) => (r as PromiseRejectedResult).reason instanceof StockError)).toBe(true);
    expect(await variant(thriftVariant)).toMatchObject({ stockOnHand: 1, reserved: 1 });

    // Cleanup for following tests: cancel releases the reservation.
    const placed = (ok[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof placeOrder>>>).value;
    await cancelOrder(placed.order.id, "test cleanup", ACTOR, false);
    expect(await variant(thriftVariant)).toMatchObject({ stockOnHand: 1, reserved: 0 });
  });

  it("rejects quantities above stock and leaves nothing reserved", async () => {
    await expect(placeOrder(customer([{ variantId: merchVariant, qty: 4 }]))).rejects.toBeInstanceOf(StockError);
    // Multi-line order: one bad line rolls back the good one too.
    await expect(
      placeOrder(customer([{ variantId: merchVariant, qty: 1 }, { variantId: thriftVariant, qty: 2 }])),
    ).rejects.toBeInstanceOf(StockError);
    expect(await variant(merchVariant)).toMatchObject({ reserved: 0 });
    expect(await variant(thriftVariant)).toMatchObject({ reserved: 0 });
  });

  it("uses the server price, not anything from the client", async () => {
    const { order } = await placeOrder(customer([{ variantId: merchVariant, qty: 2 }]));
    expect(order.subtotal).toBe(100_000);
    expect(order.status).toBe("awaiting_quote");
    await cancelOrder(order.id, "test cleanup", ACTOR, false);
  });
});

describe("order lifecycle", () => {
  it("quote → proof → approve turns the reservation into a sale", async () => {
    const { order } = await placeOrder(customer([{ variantId: merchVariant, qty: 2 }]));
    const quoted = await quoteShipping(order.id, 15_000, "JNE REG", ACTOR);
    expect(quoted.status).toBe("awaiting_payment");
    expect(quoted.uniqueCode).toBeGreaterThanOrEqual(1);
    expect(quoted.total).toBe(100_000 + 15_000 + quoted.uniqueCode!);
    expect(quoted.paymentDeadline!.getTime()).toBeGreaterThan(Date.now() + 23 * 3600_000);

    await recordPaymentProof(order.id, `${order.id}/proof.jpg`);
    const paid = await approvePayment(order.id, ACTOR);
    expect(paid.status).toBe("paid");
    expect(await variant(merchVariant)).toMatchObject({ stockOnHand: 1, reserved: 0 });

    // Approving twice must not deduct stock twice.
    await expect(approvePayment(order.id, ACTOR)).rejects.toBeInstanceOf(TransitionError);
    expect(await variant(merchVariant)).toMatchObject({ stockOnHand: 1, reserved: 0 });

    const moves = await db.select().from(stockMovements).where(eq(stockMovements.orderId, order.id));
    expect(moves.map((m) => m.type).sort()).toEqual(["reserve", "sale"]);

    // Cancelling a paid order with restock puts the items back.
    const cancelled = await cancelOrder(order.id, "customer refund", ACTOR, true);
    expect(cancelled.status).toBe("cancelled");
    expect(await variant(merchVariant)).toMatchObject({ stockOnHand: 3, reserved: 0 });
  });

  it("rejecting a proof reopens payment with a grace period", async () => {
    const { order } = await placeOrder(customer([{ variantId: thriftVariant, qty: 1 }]));
    await quoteShipping(order.id, 10_000, "SiCepat", ACTOR);
    await db.update(orders).set({ paymentDeadline: new Date(Date.now() + 60_000) }).where(eq(orders.id, order.id));
    await recordPaymentProof(order.id, `${order.id}/proof.jpg`);
    const reopened = await rejectPayment(order.id, "nominal tidak sesuai", ACTOR);
    expect(reopened.status).toBe("awaiting_payment");
    expect(reopened.paymentDeadline!.getTime()).toBeGreaterThan(Date.now() + 5 * 3600_000);
    await cancelOrder(order.id, "test cleanup", ACTOR, false);
  });

  it("sweep expires unpaid orders and cancels unquoted ones, releasing stock", async () => {
    const a = await placeOrder(customer([{ variantId: thriftVariant, qty: 1 }]));
    await quoteShipping(a.order.id, 10_000, "JNE", ACTOR);
    await db.update(orders).set({ paymentDeadline: new Date(Date.now() - 1000) }).where(eq(orders.id, a.order.id));

    const b = await placeOrder(customer([{ variantId: merchVariant, qty: 1 }]));
    await db.update(orders).set({ quoteDeadline: new Date(Date.now() - 1000) }).where(eq(orders.id, b.order.id));

    expect(await sweepOrders()).toBeGreaterThanOrEqual(2);
    const [ea] = await db.select().from(orders).where(eq(orders.id, a.order.id));
    const [eb] = await db.select().from(orders).where(eq(orders.id, b.order.id));
    expect(ea.status).toBe("expired");
    expect(eb.status).toBe("cancelled");
    expect(await variant(thriftVariant)).toMatchObject({ reserved: 0 });
    expect(await variant(merchVariant)).toMatchObject({ reserved: 0 });

    // Late proof upload after expiry is refused.
    await expect(recordPaymentProof(a.order.id, "x.jpg")).rejects.toBeInstanceOf(TransitionError);
  });

  it("gives every open order a different unique code", async () => {
    const placed = await Promise.all(
      Array.from({ length: 3 }, () => placeOrder(customer([{ variantId: merchVariant, qty: 1 }]))),
    );
    const quoted = await Promise.all(placed.map((p) => quoteShipping(p.order.id, 9_000, "JNT", ACTOR)));
    expect(new Set(quoted.map((q) => q.uniqueCode)).size).toBe(3);
    for (const p of placed) await cancelOrder(p.order.id, "test cleanup", ACTOR, false);
  });
});
