import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, CheckCircle2, Circle, MessageCircle, Truck, XCircle } from "lucide-react";
import { ProofUpload } from "@/components/order/proof-upload";
import { CopyButton, Countdown } from "@/components/order/widgets";
import type { OrderStatus } from "@/lib/db/schema";
import { formatDateTime, formatPrice, waLink } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { fmt } from "@/lib/i18n/interpolate";
import { findOrderByKey, getOrderDetail } from "@/lib/orders/service";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STEPS: OrderStatus[] = ["awaiting_quote", "awaiting_payment", "payment_review", "paid", "shipped", "completed"];
const stepIndex = (s: OrderStatus) => (s === "processing" ? STEPS.indexOf("paid") : STEPS.indexOf(s));

async function OrderView({ params, searchParams }: PageProps<"/[lang]/order/[code]">) {
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const key = typeof sp.k === "string" ? sp.k : "";
  const found = key ? await findOrderByKey(code, key) : null;
  if (!found) notFound();

  const [{ locale, t }, detail, { payment, store }] = await Promise.all([
    getDictionary(),
    getOrderDetail(found.id),
    getSettings(),
  ]);
  const { order, items, proofs } = detail!;
  const status = order.status;
  const terminal = status === "cancelled" || status === "expired";
  const current = stepIndex(status);
  const lastRejected = status === "awaiting_payment" ? proofs.find((p) => p.status === "rejected" && p.reviewNote !== "superseded") : undefined;
  const price = (n: number) => formatPrice(n, locale);
  const exact = order.total != null ? String(order.total) : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <p className="text-sm text-muted">
          {t.order.placedAt}: {formatDateTime(order.createdAt, locale)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl uppercase sm:text-3xl">{fmt(t.order.title, { code: order.code })}</h1>
          <CopyButton value={order.code} />
        </div>
        <div
          className={cn(
            "flex items-start gap-3 rounded-[var(--radius-card)] border p-4",
            terminal ? "border-danger/40 bg-danger/10" : "border-accent/30 bg-accent/5",
          )}
        >
          {terminal ? <XCircle className="mt-0.5 size-5 shrink-0 text-danger" /> : <Circle className="mt-0.5 size-5 shrink-0 fill-accent text-accent" />}
          <div>
            <p className="font-semibold">{t.order.statuses[status]}</p>
            <p className="text-sm text-fg/80">{t.order.statusHelp[status]}</p>
            {order.cancelReason && terminal && order.cancelReason !== "payment_timeout" && order.cancelReason !== "quote_timeout" && (
              <p className="mt-1 text-sm text-muted">{order.cancelReason}</p>
            )}
          </div>
        </div>
      </header>

      {!terminal && (
        <ol className="grid grid-cols-6 gap-1" aria-label={t.order.status}>
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-1.5 text-center">
              <span className={cn("h-1.5 w-full rounded-full", i <= current ? "bg-accent" : "bg-surface-2")} />
              <span className={cn("hidden text-[11px] sm:block", i === current ? "text-fg" : "text-muted")}>{t.order.statuses[s]}</span>
              {i < current ? <span className="sr-only">✓</span> : null}
            </li>
          ))}
        </ol>
      )}

      {status === "awaiting_payment" && order.total != null && order.paymentDeadline && (
        <section className="space-y-5 rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6" aria-labelledby="pay">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="pay" className="font-display text-xl uppercase">
              {t.order.payTitle}
            </h2>
            <p className="text-sm">
              <span className="text-muted">{t.order.timeLeft}: </span>
              <Countdown deadline={order.paymentDeadline.toISOString()} />
            </p>
          </div>

          {lastRejected?.reviewNote && (
            <p role="alert" className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              {fmt(t.order.rejectedNote, { note: lastRejected.reviewNote })}
            </p>
          )}

          <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
            <div className="mx-auto w-full max-w-[220px]">
              {payment.qris_image_url && (
                <Image
                  src={payment.qris_image_url}
                  alt={`QRIS ${payment.merchant_name}`}
                  width={264}
                  height={320}
                  className="h-auto w-full rounded-xl bg-white p-2"
                  unoptimized={payment.qris_image_url.endsWith(".svg")}
                />
              )}
              <p className="mt-2 text-center text-xs text-muted">{payment.merchant_name}</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-sm text-muted">{t.order.total}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <p className="text-3xl font-bold tabular-nums text-accent">{price(order.total)}</p>
                  <CopyButton value={exact} />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {t.order.deadline}: {formatDateTime(order.paymentDeadline, locale)} WIB
                </p>
              </div>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-fg/85">
                <li>{t.order.payStep1}</li>
                <li>
                  <strong>{fmt(t.order.payStep2, { amount: price(order.total) })}</strong>
                </li>
                <li>{t.order.payStep3}</li>
              </ol>
              {payment.is_dummy && (
                <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">{t.order.dummyQris}</p>
              )}
            </div>
          </div>
          <ProofUpload code={order.code} accessKey={key} />
        </section>
      )}

      {status === "payment_review" && (
        <section className="flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <p className="text-sm">{t.order.uploaded}</p>
        </section>
      )}

      {order.trackingNumber && (
        <section className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <Truck className="size-5 text-accent" />
          <div className="flex-1">
            <p className="text-sm text-muted">
              {t.order.courier}: {order.courier}
            </p>
            <p className="font-semibold tabular-nums">
              {t.order.tracking}: {order.trackingNumber}
            </p>
          </div>
          <CopyButton value={order.trackingNumber} />
        </section>
      )}

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5" aria-labelledby="items">
        <h2 id="items" className="mb-3 text-sm font-semibold">
          {t.order.items}
        </h2>
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.id} className="flex gap-3 py-3">
              {i.imageUrl && (
                <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                </div>
              )}
              <div className="flex-1 text-sm">
                <p className="font-medium">{i.productName}</p>
                <p className="text-muted">
                  {i.sizeLabel} × {i.qty}
                </p>
              </div>
              <p className="text-sm font-semibold">{price(i.unitPrice * i.qty)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t.order.subtotal}</dt>
            <dd>{price(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">
              {t.order.shipping}
              {order.courier ? ` (${order.courier})` : ""}
            </dt>
            <dd>{order.shippingCost != null ? price(order.shippingCost) : <span className="italic text-muted">{t.checkout.shippingTbd}</span>}</dd>
          </div>
          {order.uniqueCode != null && (
            <div className="flex justify-between">
              <dt className="text-muted">{t.order.uniqueCode}</dt>
              <dd>{price(order.uniqueCode)}</dd>
            </div>
          )}
          {order.total != null && (
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
              <dt>{t.order.total}</dt>
              <dd>{price(order.total)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 text-sm">
        <h2 className="mb-2 font-semibold">{t.order.shipTo}</h2>
        <p>{order.customerName}</p>
        <p className="text-muted">
          {order.address.line}, {order.address.district}, {order.address.city}, {order.address.province} {order.address.postalCode}
        </p>
        <p className="text-muted">
          {order.phone} · {order.email}
        </p>
      </section>

      <div className="flex flex-col items-center gap-2 text-center text-sm text-muted">
        <p>{t.order.saveLink}</p>
        {store.whatsapp && (
          <a
            href={waLink(store.whatsapp, `Halo OnlyPants, saya mau tanya soal pesanan ${order.code}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-accent hover:underline"
          >
            <MessageCircle className="size-4" /> {t.order.help}
          </a>
        )}
      </div>
    </div>
  );
}

export default function OrderPage(props: PageProps<"/[lang]/order/[code]">) {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-[var(--radius-card)] bg-surface" />}>
        <OrderView {...props} />
      </Suspense>
    </div>
  );
}
