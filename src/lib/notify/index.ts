import "server-only";
import nodemailer from "nodemailer";
import { db, schema } from "@/lib/db";
import type { Order } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { orderAccessKey } from "@/lib/orders/codes";
import { siteUrl } from "@/lib/site";
import { adminMessage, customerMessage, type OrderEvent } from "./templates";

let transport: ReturnType<typeof nodemailer.createTransport> | null | undefined;
function mailer() {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  if (!host) return (transport = null);
  const port = Number(process.env.SMTP_PORT ?? 465);
  transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
}

async function log(orderId: string, channel: string, event: string, recipient: string, status: string, error?: string) {
  await db.insert(schema.notificationsLog).values({ orderId, channel, event, recipient, status, error });
}

async function sendEmail(orderId: string, event: string, to: string, msg: { subject: string; text: string; html?: string }) {
  const t = mailer();
  if (!t) return log(orderId, "email", event, to, "skipped", "SMTP not configured");
  try {
    await t.sendMail({ from: process.env.MAIL_FROM, to, subject: msg.subject, text: msg.text, html: msg.html });
    await log(orderId, "email", event, to, "sent");
  } catch (e) {
    await log(orderId, "email", event, to, "failed", String(e).slice(0, 500));
  }
}

export function customerOrderUrl(order: Pick<Order, "code" | "locale">) {
  return `${siteUrl}/${order.locale}/order/${order.code}?k=${orderAccessKey(order.code)}`;
}

/**
 * Sends the email side of an order event to the customer and, when relevant,
 * the admin. WhatsApp messages are sent by the admin from the dashboard
 * (prefilled wa.me links) until an automated WhatsApp provider is configured.
 * Never throws: a failed notification must not fail the order action.
 */
export async function notifyOrder(event: OrderEvent, order: Order, opts: { note?: string } = {}) {
  try {
    const { store } = await getSettings();
    const ctx = { order, orderUrl: customerOrderUrl(order), storeName: store.name, note: opts.note };

    const customer = customerMessage(event, ctx);
    if (customer) await sendEmail(order.id, event, order.email, customer);

    const admin = adminMessage(event, { ...ctx, orderUrl: `${siteUrl}/admin/orders/${order.id}` });
    const adminTo = process.env.ADMIN_NOTIFY_EMAIL || store.email;
    if (admin && adminTo) await sendEmail(order.id, `admin_${event}`, adminTo, admin);
  } catch (e) {
    console.error("notifyOrder failed", event, order.code, e);
  }
}
