"use server";

import { after } from "next/server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { CATALOG_TAG } from "@/lib/catalog";
import { normalizePhone } from "@/lib/format";
import { notifyOrder } from "@/lib/notify";
import { placeOrder, StockError } from "@/lib/orders/service";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  locale: z.enum(["id", "en"]),
  customerName: z.string().trim().min(2).max(100),
  email: z.email().max(200),
  phone: z.string().transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: "phone" });
    return p ?? "";
  }),
  line: z.string().trim().min(5).max(300),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z.string().regex(/^\d{5}$/),
  note: z.string().trim().max(500).default(""),
  terms: z.literal(true),
  website: z.string().max(0).optional(), // honeypot
  items: z.array(z.object({ variantId: z.uuid(), qty: z.number().int().min(1).max(20) })).min(1).max(30),
});

export type CheckoutInput = z.input<typeof schema>;
export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: "validation"; fields: string[] }
  | { ok: false; error: "stock"; items: string[] }
  | { ok: false; error: "rateLimit" | "emptyCart" | "generic" };

export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    if (input.items?.length === 0) return { ok: false, error: "emptyCart" };
    return { ok: false, error: "validation", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  }
  const d = parsed.data;
  if (!(await rateLimit("checkout", 8, 600))) return { ok: false, error: "rateLimit" };

  try {
    const { order, key } = await placeOrder({
      locale: d.locale,
      customerName: d.customerName,
      email: d.email.toLowerCase(),
      phone: d.phone,
      address: { line: d.line, district: d.district, city: d.city, province: d.province, postalCode: d.postalCode },
      note: d.note,
      items: d.items,
    });
    updateTag(CATALOG_TAG);
    after(() => notifyOrder("placed", order));
    return { ok: true, url: `/${d.locale}/order/${order.code}?k=${key}` };
  } catch (e) {
    if (e instanceof StockError) {
      updateTag(CATALOG_TAG);
      return { ok: false, error: "stock", items: e.items };
    }
    console.error("checkout failed", e);
    return { ok: false, error: "generic" };
  }
}
