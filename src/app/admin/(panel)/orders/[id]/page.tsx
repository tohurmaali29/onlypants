import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { OrderActions } from "@/components/admin/order-actions";
import { Card, StatusBadge } from "@/components/admin/ui";
import { CopyButtonAdmin } from "@/components/admin/copy";
import { staffNames } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatPrice, waLink } from "@/lib/format";
import { customerOrderUrl } from "@/lib/notify";
import { whatsappText, type OrderEvent } from "@/lib/notify/templates";
import { getOrderDetail } from "@/lib/orders/service";
import { getSettings } from "@/lib/settings";

// Reads the session on every request (see (panel)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Detail pesanan" };

const EVENT_LABELS: [RegExp, string][] = [
  [/^order placed$/, "Pesanan dibuat"],
  [/^payment proof uploaded$/, "Bukti bayar diupload"],
  [/^payment approved$/, "Pembayaran disetujui"],
  [/^payment rejected: /, "Bukti bayar ditolak: "],
  [/^shipping set: /, "Ongkir diisi: "],
  [/^packing$/, "Mulai dikemas"],
  [/^shipped: /, "Dikirim: "],
  [/^completed$/, "Selesai"],
  [/^payment_timeout$/, "Kedaluwarsa (tidak dibayar)"],
  [/^quote_timeout$/, "Batal otomatis (ongkir tidak diisi)"],
];
const eventLabel = (msg: string) => {
  for (const [re, label] of EVENT_LABELS) if (re.test(msg)) return msg.replace(re, label);
  return msg;
};

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [detail, names, { store }] = await Promise.all([getOrderDetail(id), staffNames(), getSettings()]);
  if (!detail) notFound();
  const { order, items, proofs, events } = detail;

  const orderUrl = customerOrderUrl(order);
  const ctx = { order, orderUrl, storeName: store.name };
  const waEvents: { event: OrderEvent; label: string; show: boolean }[] = [
    { event: "placed", label: "Konfirmasi pesanan diterima", show: order.status === "awaiting_quote" },
    { event: "quoted", label: "Kirim total & cara bayar", show: order.status === "awaiting_payment" },
    { event: "reminder", label: "Ingatkan bayar", show: order.status === "awaiting_payment" },
    { event: "approved", label: "Pembayaran terverifikasi", show: order.status === "paid" || order.status === "processing" },
    { event: "shipped", label: "Kirim nomor resi", show: order.status === "shipped" },
  ];
  const a = order.address;

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Pesanan
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl">{order.code}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted">{formatDateTime(order.createdAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <OrderActions
            order={{
              id: order.id,
              status: order.status,
              subtotal: order.subtotal,
              shippingCost: order.shippingCost,
              courier: order.courier,
              total: order.total,
              uniqueCode: order.uniqueCode,
              trackingNumber: order.trackingNumber,
              paymentDeadline: order.paymentDeadline?.toISOString() ?? null,
              quoteDeadline: order.quoteDeadline.toISOString(),
              internalNote: order.internalNote,
            }}
            proofs={proofs.map((p) => ({
              id: p.id,
              path: p.storagePath,
              status: p.status,
              note: p.reviewNote,
              createdAt: p.createdAt.toISOString(),
            }))}
          />

          <Card>
            <h2 className="mb-3 font-semibold">Barang</h2>
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3 text-sm">
                  {i.imageUrl && (
                    <div className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                      <Image src={i.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Link href={`/admin/products/${i.productId}`} className="font-medium hover:text-accent">
                      {i.productName}
                    </Link>
                    <p className="text-muted">
                      {i.sizeLabel} × {i.qty}
                    </p>
                  </div>
                  <p className="tabular-nums">{formatPrice(i.unitPrice * i.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Ongkir {order.courier && `(${order.courier})`}</dt><dd>{order.shippingCost != null ? formatPrice(order.shippingCost) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Kode unik</dt><dd>{order.uniqueCode ?? "—"}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 font-bold"><dt>Total</dt><dd>{order.total != null ? formatPrice(order.total) : "—"}</dd></div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Riwayat</h2>
            <ol className="space-y-3 border-l border-line pl-4 text-sm">
              {events.map((e) => (
                <li key={e.id}>
                  <p>{eventLabel(e.message)}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(e.createdAt)} · {e.actorId ? (names[e.actorId] ?? "staff") : "sistem / customer"}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">Customer</h2>
            <p className="font-medium">{order.customerName}</p>
            <p className="text-sm text-muted">{order.email}</p>
            <p className="text-sm text-muted">+{order.phone}</p>
            <h3 className="mt-4 mb-1 text-sm font-semibold">Alamat kirim</h3>
            <p className="text-sm text-muted">
              {a.line}, {a.district}, {a.city}, {a.province} {a.postalCode}
            </p>
            <CopyButtonAdmin
              label="Salin alamat"
              value={`${order.customerName}\n+${order.phone}\n${a.line}, ${a.district}, ${a.city}, ${a.province} ${a.postalCode}`}
            />
            {order.note && (
              <>
                <h3 className="mt-4 mb-1 text-sm font-semibold">Catatan customer</h3>
                <p className="text-sm text-muted">{order.note}</p>
              </>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <MessageCircle className="size-4 text-success" /> WhatsApp customer
            </h2>
            <div className="space-y-2">
              {waEvents
                .filter((w) => w.show)
                .map((w) => {
                  const text = whatsappText(w.event, ctx);
                  return text ? (
                    <a
                      key={w.event}
                      href={waLink(order.phone, text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl bg-[#1fa855] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#1b934b]"
                    >
                      {w.label}
                    </a>
                  ) : null;
                })}
              <a
                href={waLink(order.phone, `Halo ${order.customerName}, ini OnlyPants soal pesanan ${order.code}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-line px-4 py-2.5 text-center text-sm hover:border-accent"
              >
                Chat bebas
              </a>
              <p className="pt-1 text-xs text-muted">Pesan sudah terisi otomatis termasuk link halaman pesanan.</p>
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">Link customer</h2>
            <p className="mb-2 text-xs break-all text-muted">{orderUrl}</p>
            <CopyButtonAdmin label="Salin link" value={orderUrl} />
          </Card>
        </div>
      </div>
    </>
  );
}
