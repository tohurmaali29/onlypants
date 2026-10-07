import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, lt, or, sql, sum } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { OrderStatus } from "@/lib/db/schema";

const { orders, orderItems, variants, products, categories, productImages, stockMovements, staff } = schema;
const PAID: OrderStatus[] = ["paid", "processing", "shipped", "completed"];

export async function dashboardStats() {
  const now = new Date();
  // WIB is a fixed UTC+7 (no DST), so day boundaries are simple arithmetic.
  const WIB = 7 * 3600_000;
  const jakartaMidnight = new Date(Math.floor((now.getTime() + WIB) / 86400_000) * 86400_000 - WIB);
  const wibNow = new Date(now.getTime() + WIB);
  const monthStart = new Date(Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), 1) - WIB);

  const [byStatus, dueSoon, lowStock, today, month] = await Promise.all([
    db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
    db
      .select()
      .from(orders)
      .where(and(eq(orders.status, "awaiting_payment"), lt(orders.paymentDeadline, new Date(now.getTime() + 3 * 3600_000))))
      .orderBy(asc(orders.paymentDeadline))
      .limit(10),
    db
      .select({
        productId: products.id,
        name: products.nameId,
        type: products.type,
        size: variants.sizeLabel,
        available: sql<number>`${variants.stockOnHand} - ${variants.reserved}`,
      })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(products.status, "active"), eq(products.type, "merch"), sql`${variants.stockOnHand} - ${variants.reserved} <= 1`))
      .limit(10),
    db
      .select({ revenue: sum(orders.total), n: count() })
      .from(orders)
      .where(and(inArray(orders.status, PAID), gte(orders.paidAt, jakartaMidnight))),
    db
      .select({ revenue: sum(orders.total), n: count() })
      .from(orders)
      .where(and(inArray(orders.status, PAID), gte(orders.paidAt, monthStart))),
  ]);

  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Partial<Record<OrderStatus, number>>;
  return {
    counts,
    dueSoon,
    lowStock,
    today: { revenue: Number(today[0]?.revenue ?? 0), orders: today[0]?.n ?? 0 },
    month: { revenue: Number(month[0]?.revenue ?? 0), orders: month[0]?.n ?? 0 },
  };
}

export type OrderFilter = { status?: OrderStatus | "open"; q?: string; page?: number; assigneeId?: string };
const PAGE_SIZE = 25;

export async function listOrders({ status, q, page = 1, assigneeId }: OrderFilter) {
  const conds = [];
  if (assigneeId) conds.push(eq(orders.assigneeId, assigneeId));
  if (status === "open") conds.push(inArray(orders.status, ["awaiting_quote", "awaiting_payment", "payment_review", "paid", "processing"]));
  else if (status) conds.push(eq(orders.status, status));
  if (q) {
    const like = `%${q}%`;
    conds.push(or(ilike(orders.code, like), ilike(orders.customerName, like), ilike(orders.phone, like), ilike(orders.email, like)));
  }
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(orders).where(where),
  ]);
  const ids = rows.map((r) => r.id);
  const items = ids.length
    ? await db
        .select({ orderId: orderItems.orderId, n: sql<number>`sum(${orderItems.qty})::int` })
        .from(orderItems)
        .where(inArray(orderItems.orderId, ids))
        .groupBy(orderItems.orderId)
    : [];
  return {
    rows: rows.map((r) => ({ ...r, itemCount: items.find((i) => i.orderId === r.id)?.n ?? 0 })),
    total: n,
    pages: Math.max(1, Math.ceil(n / PAGE_SIZE)),
  };
}

export async function staffNames() {
  const rows = await db.select({ id: staff.userId, name: staff.name }).from(staff);
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
}

export async function listProductsAdmin(q?: string, status?: string) {
  const conds = [];
  if (q) conds.push(or(ilike(products.nameId, `%${q}%`), ilike(products.nameEn, `%${q}%`), ilike(products.slug, `%${q}%`)));
  if (status === "draft" || status === "active" || status === "archived") conds.push(eq(products.status, status));
  else conds.push(inArray(products.status, ["draft", "active"]));
  const rows = await db
    .select({ p: products, c: categories })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conds))
    .orderBy(desc(products.createdAt));
  const ids = rows.map((r) => r.p.id);
  if (!ids.length) return [];
  const [vars, imgs] = await Promise.all([
    db.select().from(variants).where(inArray(variants.productId, ids)).orderBy(asc(variants.sort)),
    db.select().from(productImages).where(and(inArray(productImages.productId, ids), eq(productImages.sort, 0))),
  ]);
  return rows.map(({ p, c }) => ({
    ...p,
    categoryName: c.nameId,
    image: imgs.find((i) => i.productId === p.id)?.url,
    variants: vars.filter((v) => v.productId === p.id),
  }));
}

export async function getProductAdmin(id: string) {
  const [p] = await db.select().from(products).where(eq(products.id, id));
  if (!p) return null;
  const [vars, imgs, moves] = await Promise.all([
    db.select().from(variants).where(eq(variants.productId, id)).orderBy(asc(variants.sort)),
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sort)),
    db
      .select({ m: stockMovements, size: variants.sizeLabel, actor: staff.name, orderCode: orders.code })
      .from(stockMovements)
      .innerJoin(variants, eq(variants.id, stockMovements.variantId))
      .leftJoin(staff, eq(staff.userId, stockMovements.actorId))
      .leftJoin(orders, eq(orders.id, stockMovements.orderId))
      .where(eq(variants.productId, id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(50),
  ]);
  return { product: p, variants: vars, images: imgs, movements: moves };
}

export async function salesReport(days: number) {
  const since = new Date(Date.now() - days * 86400_000);
  const [daily, best, totals] = await Promise.all([
    db.execute<{ day: string; revenue: number; orders: number }>(sql`
      select to_char(date_trunc('day', paid_at at time zone 'Asia/Jakarta'), 'YYYY-MM-DD') as day,
             sum(total)::bigint as revenue, count(*)::int as orders
      from orders where status in ('paid','processing','shipped','completed') and paid_at >= ${since.toISOString()}::timestamptz
      group by 1 order by 1`),
    db
      .select({ name: orderItems.productName, qty: sql<number>`sum(${orderItems.qty})::int`, revenue: sql<number>`sum(${orderItems.qty} * ${orderItems.unitPrice})::bigint` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(inArray(orders.status, PAID), gte(orders.paidAt, since)))
      .groupBy(orderItems.productName)
      .orderBy(desc(sql`sum(${orderItems.qty} * ${orderItems.unitPrice})`))
      .limit(10),
    db
      .select({ revenue: sum(orders.total), shipping: sum(orders.shippingCost), n: count() })
      .from(orders)
      .where(and(inArray(orders.status, PAID), gte(orders.paidAt, since))),
  ]);
  return {
    daily: daily.map((d) => ({ day: d.day, revenue: Number(d.revenue), orders: d.orders })),
    best: best.map((b) => ({ ...b, revenue: Number(b.revenue) })),
    revenue: Number(totals[0]?.revenue ?? 0),
    shipping: Number(totals[0]?.shipping ?? 0),
    orders: totals[0]?.n ?? 0,
  };
}
