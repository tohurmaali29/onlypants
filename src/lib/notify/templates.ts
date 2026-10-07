import type { Order } from "@/lib/db/schema";
import { formatDateTime, formatPrice } from "@/lib/format";

export type OrderEvent =
  | "placed"
  | "quoted"
  | "reminder"
  | "proof_uploaded"
  | "approved"
  | "rejected"
  | "shipped"
  | "expired"
  | "cancelled";

type Ctx = { order: Order; orderUrl: string; storeName: string; note?: string };

/** Customer-facing message per event, in the language the customer checked out in. */
export function customerMessage(event: OrderEvent, { order, orderUrl, storeName, note }: Ctx) {
  const en = order.locale === "en";
  const l = en ? "en" : "id";
  const total = order.total != null ? formatPrice(order.total, l) : "";
  const deadline = order.paymentDeadline ? formatDateTime(order.paymentDeadline, l) : "";
  const hi = en ? `Hi ${order.customerName},` : `Halo ${order.customerName},`;
  const link = en ? `Order page: ${orderUrl}` : `Halaman pesanan: ${orderUrl}`;

  const m: Record<OrderEvent, [string, string] | null> = {
    placed: en
      ? [`Order ${order.code} received`, `We've received your order ${order.code} and are holding the items for you. Our admin will confirm the shipping cost shortly, then you'll get the total to pay.`]
      : [`Pesanan ${order.code} diterima`, `Pesanan ${order.code} sudah kami terima dan barangnya kami tahan untuk kamu. Admin akan segera mengonfirmasi ongkir, lalu kamu akan menerima total yang harus dibayar.`],
    quoted: en
      ? [`Pay ${total} for order ${order.code}`, `Shipping is confirmed (${order.courier}). Please pay EXACTLY ${total} via QRIS before ${deadline} WIB, then upload your payment proof on the order page.`]
      : [`Bayar ${total} untuk pesanan ${order.code}`, `Ongkir sudah dikonfirmasi (${order.courier}). Silakan bayar PERSIS ${total} via QRIS sebelum ${deadline} WIB, lalu upload bukti bayar di halaman pesanan.`],
    reminder: en
      ? [`Reminder: order ${order.code} expires soon`, `Your payment of ${total} is due before ${deadline} WIB. After that, the order is cancelled automatically.`]
      : [`Pengingat: pesanan ${order.code} hampir kedaluwarsa`, `Pembayaran ${total} jatuh tempo sebelum ${deadline} WIB. Setelah itu pesanan otomatis dibatalkan.`],
    proof_uploaded: null,
    approved: en
      ? [`Payment confirmed — order ${order.code}`, `Thanks! Your payment is verified and we're packing your order.`]
      : [`Pembayaran terverifikasi — pesanan ${order.code}`, `Terima kasih! Pembayaran kamu sudah terverifikasi dan pesanan sedang kami kemas.`],
    rejected: en
      ? [`Payment proof needs attention — ${order.code}`, `We couldn't verify your payment proof: ${note}. Please check and upload again before ${deadline} WIB.`]
      : [`Bukti bayar perlu dicek — ${order.code}`, `Bukti bayar kamu belum bisa kami verifikasi: ${note}. Silakan cek dan upload ulang sebelum ${deadline} WIB.`],
    shipped: en
      ? [`Order ${order.code} shipped`, `Your order is on its way via ${order.courier}. Tracking number: ${order.trackingNumber}.`]
      : [`Pesanan ${order.code} dikirim`, `Pesanan kamu sudah dikirim via ${order.courier}. Nomor resi: ${order.trackingNumber}.`],
    expired: en
      ? [`Order ${order.code} expired`, `The payment window has passed, so the order was cancelled and the items released.`]
      : [`Pesanan ${order.code} kedaluwarsa`, `Batas waktu pembayaran sudah lewat, jadi pesanan dibatalkan dan barang dilepas kembali.`],
    cancelled: en
      ? [`Order ${order.code} cancelled`, `Your order was cancelled.${note ? ` Reason: ${note}.` : ""} Questions? Just reply or chat with us.`]
      : [`Pesanan ${order.code} dibatalkan`, `Pesanan kamu dibatalkan.${note ? ` Alasan: ${note}.` : ""} Ada pertanyaan? Balas email ini atau chat kami.`],
  };

  const msg = m[event];
  if (!msg) return null;
  const [subject, body] = msg;
  const text = `${hi}\n\n${body}\n\n${link}\n\n— ${storeName}`;
  return { subject, text, html: emailHtml(subject, hi, body, orderUrl, en ? "View order" : "Lihat pesanan", storeName) };
}

/** Admin alert per event. */
export function adminMessage(event: OrderEvent, { order, orderUrl }: Ctx) {
  const m: Partial<Record<OrderEvent, string>> = {
    placed: `Pesanan baru ${order.code} dari ${order.customerName} (${order.address.city}). Subtotal ${formatPrice(order.subtotal)}. Perlu input ongkir.`,
    proof_uploaded: `Bukti bayar masuk untuk ${order.code} (${order.total != null ? formatPrice(order.total) : "-"}). Perlu verifikasi.`,
  };
  const body = m[event];
  if (!body) return null;
  return { subject: `[Admin] ${body.split(".")[0]}`, text: `${body}\n\n${orderUrl}` };
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function emailHtml(title: string, hi: string, body: string, url: string, cta: string, store: string) {
  return `<!doctype html><html><body style="margin:0;background:#0b0d12;font-family:Arial,sans-serif;color:#f2f4f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#141821;border-radius:16px;border:1px solid #2a3242">
<tr><td style="padding:28px 28px 8px;font-size:22px;font-weight:800"><span style="color:#52b1ff">Only</span><span style="color:#4752d4;font-style:italic">Pants</span></td></tr>
<tr><td style="padding:8px 28px;font-size:18px;font-weight:700">${esc(title)}</td></tr>
<tr><td style="padding:8px 28px;font-size:15px;line-height:1.6;color:#d6dae2">${esc(hi)}<br><br>${esc(body)}</td></tr>
<tr><td style="padding:20px 28px 28px"><a href="${esc(url)}" style="display:inline-block;background:#3944bc;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px">${esc(cta)}</a></td></tr>
</table><p style="font-size:12px;color:#9aa3b2;margin-top:16px">${esc(store)}</p></td></tr></table></body></html>`;
}

/** Prefilled WhatsApp text for the admin to send to the customer. */
export function whatsappText(event: OrderEvent, ctx: Ctx) {
  const msg = customerMessage(event, ctx);
  return msg ? msg.text : null;
}
