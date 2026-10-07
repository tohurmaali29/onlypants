import { and, desc, gte, inArray } from "drizzle-orm";
import { getStaff } from "@/lib/auth";
import { db, schema } from "@/lib/db";

const { orders } = schema;

const cell = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Quote everything and neutralise spreadsheet formulas (CSV injection).
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(request: Request) {
  const staff = await getStaff();
  if (!staff || staff.role !== "owner") return new Response("Forbidden", { status: 403 });

  const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await db
    .select()
    .from(orders)
    .where(and(inArray(orders.status, ["paid", "processing", "shipped", "completed"]), gte(orders.paidAt, since)))
    .orderBy(desc(orders.paidAt));

  const header = ["kode", "status", "dibayar", "customer", "email", "whatsapp", "kota", "subtotal", "ongkir", "kode_unik", "total", "kurir", "resi"];
  const lines = rows.map((o) =>
    [o.code, o.status, o.paidAt, o.customerName, o.email, o.phone, o.address.city, o.subtotal, o.shippingCost, o.uniqueCode, o.total, o.courier, o.trackingNumber]
      .map(cell)
      .join(","),
  );
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n"); // BOM so Excel reads UTF-8

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="onlypants-penjualan-${days}hari.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
