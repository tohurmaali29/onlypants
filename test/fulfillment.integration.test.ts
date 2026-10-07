// Packing/shipping proof and take-over rules. Runs against the local Supabase database.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { approvePayment, markProcessing, placeOrder, quoteShipping, TransitionError } from "@/lib/orders/service";
import { AssignedToOtherError, recordPacking, recordShipping, takeOver } from "@/lib/orders/fulfillment";

const A = "00000000-0000-4000-8000-0000000000a1"; // staff A
const B = "00000000-0000-4000-8000-0000000000b2"; // staff B / owner
const proof = (takeOver = false) => ({ photos: ["x/1.jpg"], note: "", takeOver });
let variantId = "";
let productId = "";
const orderIds: string[] = [];

async function paidOrder() {
  const { order } = await placeOrder({
    locale: "id",
    customerName: "F Test",
    email: "f@example.com",
    phone: "6281200001111",
    address: { line: "Jl. A 1", district: "B", city: "C", province: "D", postalCode: "12345" },
    note: "",
    items: [{ variantId, qty: 1 }],
  });
  orderIds.push(order.id);
  await quoteShipping(order.id, 10_000, "JNE", A);
  await approvePayment(order.id, A);
  return order.id;
}

beforeAll(async () => {
  for (const [id, email, role] of [[A, "itest-a@onlypants.test", "staff"], [B, "itest-b@onlypants.test", "owner"]] as const) {
    await db.execute(sql`insert into auth.users (id, instance_id, aud, role, email)
      values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}) on conflict (id) do nothing`);
    await db.execute(sql`insert into staff (user_id, name, email, role) values (${id}, ${email}, ${email}, ${role}) on conflict (user_id) do nothing`);
  }
  const [cat] = await db.select().from(schema.categories).limit(1);
  const [p] = await db
    .insert(schema.products)
    .values({ slug: `itest-ff-${Date.now()}`, type: "merch", categoryId: cat.id, nameId: "FF", nameEn: "FF", price: 50_000, status: "active" })
    .returning();
  productId = p.id;
  const [v] = await db.insert(schema.variants).values({ productId: p.id, sizeLabel: "M", stockOnHand: 10 }).returning();
  variantId = v.id;
});

afterAll(async () => {
  if (orderIds.length) await db.delete(schema.orders).where(inArray(schema.orders.id, orderIds));
  await db.delete(schema.products).where(eq(schema.products.id, productId));
});

describe("fulfillment proof & take-over", () => {
  it("records who packed and who took over shipping", async () => {
    const id = await paidOrder();
    await markProcessing(id, A); // A claims
    await expect(recordShipping(id, A, { ...proof(), trackingNumber: "R1", courier: "JNE" })).rejects.toBeInstanceOf(TransitionError); // no packing proof yet

    const { step: packed } = await recordPacking(id, A, proof());
    expect(packed.actorId).toBe(A);
    expect(packed.tookOverFrom).toBeNull();

    // B must explicitly take over
    await expect(recordShipping(id, B, { ...proof(), trackingNumber: "R1", courier: "JNE" })).rejects.toBeInstanceOf(AssignedToOtherError);
    const { order, step: shipped } = await recordShipping(id, B, { ...proof(true), trackingNumber: "R1", courier: "JNE" });
    expect(shipped.actorId).toBe(B);
    expect(shipped.tookOverFrom).toBe(A);
    expect(order).toMatchObject({ status: "shipped", trackingNumber: "R1", assigneeId: B });
  });

  it("marks a take-over at packing time and after an explicit take-over", async () => {
    const id = await paidOrder();
    await markProcessing(id, A);
    await takeOver(id, B); // B claims it first
    await expect(recordPacking(id, A, proof())).rejects.toBeInstanceOf(AssignedToOtherError);
    const { step } = await recordPacking(id, B, proof());
    expect(step.tookOverFrom).toBe(A); // A had started packing
    const { step: shipped } = await recordShipping(id, B, { ...proof(), trackingNumber: "R2", courier: "JNE" });
    expect(shipped.tookOverFrom).toBeNull(); // same person packed and shipped
  });

  it("requires at least one photo", async () => {
    const id = await paidOrder();
    await markProcessing(id, A);
    await expect(recordPacking(id, A, { photos: [], note: "", takeOver: false })).rejects.toThrow();
  });
});
