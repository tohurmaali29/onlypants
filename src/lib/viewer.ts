import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createAuthClient } from "@/lib/supabase/server";

export type Viewer = {
  userId: string;
  email: string;
  staff: { name: string; role: "owner" | "staff"; active: boolean } | null;
  customer: { name: string; phone: string } | null;
};

/** Whoever is signed in (customer and/or staff), memoized per request. Request-time only. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  await connection();
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const [[staff], [customer]] = await Promise.all([
    db.select().from(schema.staff).where(eq(schema.staff.userId, claims.sub)),
    db.select().from(schema.customers).where(eq(schema.customers.userId, claims.sub)),
  ]);
  return {
    userId: claims.sub,
    email: String(claims.email ?? ""),
    staff: staff ? { name: staff.name, role: staff.role, active: staff.active } : null,
    customer: customer ? { name: customer.name, phone: customer.phone } : null,
  };
});

export async function getAddresses(userId: string) {
  return db
    .select()
    .from(schema.customerAddresses)
    .where(eq(schema.customerAddresses.userId, userId))
    .orderBy(desc(schema.customerAddresses.isDefault), asc(schema.customerAddresses.createdAt));
}

export async function getCustomerOrders(userId: string) {
  return db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.customerId, userId))
    .orderBy(desc(schema.orders.createdAt))
    .limit(50);
}
