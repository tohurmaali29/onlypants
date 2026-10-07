import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { and, eq, gt, inArray, lt, notExists, sql } from "drizzle-orm";
import { CATALOG_TAG } from "@/lib/catalog";
import { db, schema } from "@/lib/db";
import { notifyOrder } from "@/lib/notify";
import { sweepOrders } from "@/lib/orders/service";
import { createServiceClient } from "@/lib/supabase/server";

const { orders, notificationsLog, paymentProofs } = schema;
const PROOF_RETENTION_DAYS = 90; // promised in the privacy policy

const notNotified = (...events: string[]) =>
  notExists(
    db
      .select({ one: sql`1` })
      .from(notificationsLog)
      .where(and(eq(notificationsLog.orderId, orders.id), inArray(notificationsLog.event, events))),
  );

/**
 * Expires overdue orders and sends the emails the database job can't send.
 * Called by Vercel Cron (daily on Hobby) and by Supabase pg_cron + pg_net
 * (every 10 minutes, see docs/DEPLOY.md). Idempotent.
 */
export async function GET(request: Request) {
  await connection();
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const swept = await sweepOrders();
  const dayAgo = new Date(Date.now() - 86400_000);

  // Orders auto-closed by the sweep (here or by pg_cron) that the customer hasn't heard about.
  const closed = await db
    .select()
    .from(orders)
    .where(
      and(
        inArray(orders.status, ["expired", "cancelled"]),
        inArray(orders.cancelReason, ["payment_timeout", "quote_timeout"]),
        gt(orders.cancelledAt, dayAgo),
        notNotified("expired", "cancelled"),
      ),
    );

  // Payment reminder ~3 hours before the deadline, once.
  const soon = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "awaiting_payment"),
        lt(orders.paymentDeadline, new Date(Date.now() + 3 * 3600_000)),
        gt(orders.paymentDeadline, new Date()),
        notNotified("reminder"),
      ),
    );

  for (const o of closed) {
    if (o.status === "expired") await notifyOrder("expired", o);
    else
      await notifyOrder("cancelled", o, {
        note: o.locale === "en" ? "we couldn't confirm shipping in time" : "ongkir belum sempat kami konfirmasi tepat waktu",
      });
  }
  for (const o of soon) await notifyOrder("reminder", o);
  if (swept > 0 || closed.length > 0) revalidateTag(CATALOG_TAG, "max");

  // Privacy: drop payment proofs once they're no longer needed.
  const old = await db
    .select({ id: paymentProofs.id, path: paymentProofs.storagePath })
    .from(paymentProofs)
    .where(lt(paymentProofs.createdAt, new Date(Date.now() - PROOF_RETENTION_DAYS * 86400_000)))
    .limit(500);
  if (old.length) {
    await createServiceClient().storage.from("payment-proofs").remove(old.map((o) => o.path));
    await db.delete(paymentProofs).where(inArray(paymentProofs.id, old.map((o) => o.id)));
  }

  return Response.json({ swept, expiredNotified: closed.length, reminders: soon.length, proofsPurged: old.length });
}
