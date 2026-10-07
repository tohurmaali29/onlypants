import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader, STATUS_LABEL, StatusBadge } from "@/components/admin/ui";
import { listOrders, type OrderFilter } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { orderStatus, type OrderStatus } from "@/lib/db/schema";
import { formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

// Reads the session on every request (see (panel)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Pesanan" };

const TABS: { value: OrderFilter["status"]; label: string }[] = [
  { value: "open", label: "Perlu diproses" },
  { value: "awaiting_quote", label: STATUS_LABEL.awaiting_quote },
  { value: "awaiting_payment", label: STATUS_LABEL.awaiting_payment },
  { value: "payment_review", label: STATUS_LABEL.payment_review },
  { value: "paid", label: STATUS_LABEL.paid },
  { value: "processing", label: STATUS_LABEL.processing },
  { value: "shipped", label: STATUS_LABEL.shipped },
  { value: undefined, label: "Semua" },
];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff();
  const sp = await searchParams;
  const raw = typeof sp.status === "string" ? sp.status : "open";
  const status = raw === "all" ? undefined : raw === "open" || (orderStatus.enumValues as string[]).includes(raw) ? (raw as OrderStatus | "open") : "open";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pages } = await listOrders({ status, q, page });

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: status ?? "all", q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/orders?${p}`;
  };

  return (
    <>
      <PageHeader title="Pesanan">
        <form className="relative w-full sm:w-72">
          <input type="hidden" name="status" value={status ?? "all"} />
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Kode, nama, WA, email" className="input-field py-2 pl-9" aria-label="Cari pesanan" />
        </form>
      </PageHeader>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {TABS.map((t) => {
          const active = (t.value ?? "all") === (status ?? "all");
          return (
            <Link
              key={t.label}
              href={href({ status: t.value ?? "all", page: undefined })}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm",
                active ? "border-primary bg-primary text-white" : "border-line text-muted hover:text-fg",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <p className="mb-3 text-sm text-muted">{total} pesanan</p>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center text-muted">Belum ada pesanan di sini.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface text-left text-xs text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Pesanan</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-accent">
                      {o.code}
                    </Link>
                    <p className="text-xs text-muted">{o.itemCount} barang</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{o.customerName}</p>
                    <p className="text-xs text-muted">{o.address.city}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPrice(o.total ?? o.subtotal)}
                    {o.total == null && <p className="text-xs text-muted">+ ongkir</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex justify-center gap-2" aria-label="Halaman">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href({ page: String(n) })}
              aria-current={n === page ? "page" : undefined}
              className={cn("grid size-9 place-items-center rounded-full text-sm", n === page ? "bg-primary text-white" : "border border-line")}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
