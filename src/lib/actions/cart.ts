"use server";

import { z } from "zod";
import { getLiveVariants } from "@/lib/catalog";

const ids = z.array(z.uuid()).max(50);

/** Live stock and price for the variants in a visitor's cart. */
export async function checkCart(variantIds: string[]) {
  const parsed = ids.safeParse(variantIds);
  if (!parsed.success) return [];
  const rows = await getLiveVariants(parsed.data);
  return rows.map((r) => ({
    variantId: r.id,
    available: Math.max(0, r.stockOnHand - r.reserved),
    price: r.price,
  }));
}
