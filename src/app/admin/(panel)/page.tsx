import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, PackageX } from "lucide-react";
import { Card, PageHeader, STATUS_LABEL } from "@/components/admin/ui";
import { dashboardStats } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/db/schema";

// Reads the session on every request (see (panel)/layout.tsx).
export const instant = false;

const ACTION: { status: OrderStatus; hint: string }[] = [
  { status: "awaiting_quote", hint: "Input ongkir" },
  { status: "payment_review", hint: "Verifikasi bukti bayar" },
  { status: "paid", hint: "Kemas & kirim" },
  { status: "processing", hint: "Input resi" },
];

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const staff = await requireStaff();
  const [stats, sp] = await Promise.all([dashboardStats(), searchParams]);
  const owner = staff.role === "owner";

  return (
    <>
      <PageHeader title={`Halo, ${staff.name.split(" ")[0]}`} />
      {sp.denied && (
        <p role="alert" className="mb-6 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
          Halaman itu khusus owner.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ACTION.map(({ status, hint }) => {
          const n = stats.counts[status] ?? 0;
          return (
            <Link
              key={status}
              href={`/admin/orders?status=${status}`}
              className={`rounded-[var(--radius-card)] border p-4 transition-colors hover:border-accent ${n > 0 ? "border-primary bg-primary/10" : "border-line bg-surface"}`}
            >
              <p className="text-sm text-muted">{STATUS_LABEL[status]}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{n}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                {hint} <ArrowRight className="size-3" />
              </p>
            </Link>
          );
        })}
      </div>

      {owner && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card>
            <p className="text-sm text-muted">Penjualan hari ini</p>
            <p className="mt-1 text-2xl font-bold">{formatPrice(stats.today.revenue)}</p>
            <p className="text-xs text-muted">{stats.today.orders} pesanan dibayar</p>
          </Card>
          <Card>
            <p className="text-sm text-muted">Penjualan bulan ini</p>
            <p className="mt-1 text-2xl font-bold">{formatPrice(stats.month.revenue)}</p>
            <p className="text-xs text-muted">{stats.month.orders} pesanan dibayar</p>
          </Card>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Clock className="size-4 text-warning" /> Deadline bayar &lt; 3 jam
          </h2>
          {stats.dueSoon.length === 0 ? (
            <p className="text-sm text-muted">Tidak ada.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {stats.dueSoon.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-accent">
                    {o.code} · {o.customerName}
                  </Link>
                  <span className="text-xs text-muted">{o.paymentDeadline && formatDateTime(o.paymentDeadline)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <PackageX className="size-4 text-danger" /> Stok merch menipis
          </h2>
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-muted">Aman.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {stats.lowStock.map((v) => (
                <li key={`${v.productId}-${v.size}`} className="flex items-center justify-between py-2">
                  <Link href={`/admin/products/${v.productId}`} className="hover:text-accent">
                    {v.name} · {v.size}
                  </Link>
                  <span className={v.available <= 0 ? "text-danger" : "text-warning"}>sisa {v.available}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {(stats.counts.awaiting_quote ?? 0) > 0 && (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted">
          <AlertTriangle className="size-4 text-warning" /> Pesanan tanpa ongkir otomatis batal setelah 48 jam.
        </p>
      )}
    </>
  );
}
