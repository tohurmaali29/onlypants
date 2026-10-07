import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Card, PageHeader } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { salesReport } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

// Reads the session on every request (see (panel)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Laporan" };

const PERIODS = [7, 30, 90] as const;

/** Every calendar day (WIB) in the window, so gaps show as empty bars instead of disappearing. */
function fillDays(days: number, rows: { day: string; revenue: number; orders: number }[]) {
  const out = [];
  const WIB = 7 * 3600_000;
  const today = new Date(Date.now() + WIB);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000).toISOString().slice(0, 10);
    out.push(rows.find((r) => r.day === d) ?? { day: d, revenue: 0, orders: 0 });
  }
  return out;
}

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireStaff("owner");
  const sp = await searchParams;
  const days = PERIODS.includes(Number(sp.days) as (typeof PERIODS)[number]) ? Number(sp.days) : 30;
  const report = await salesReport(days);
  const series = fillDays(days, report.daily);
  const goods = report.revenue - report.shipping;

  return (
    <>
      <PageHeader title="Laporan">
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin/reports?days=${p}`}
              className={cn("rounded-full border px-3.5 py-1.5 text-sm", p === days ? "border-primary bg-primary text-white" : "border-line text-muted hover:text-fg")}
            >
              {p} hari
            </Link>
          ))}
          <a href={`/admin/reports/export?days=${days}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Download className="size-4" /> CSV
          </a>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "Omzet (termasuk ongkir)", v: formatPrice(report.revenue) },
          { l: "Di luar ongkir", v: formatPrice(goods) },
          { l: "Pesanan dibayar", v: String(report.orders) },
          { l: "Rata-rata per pesanan", v: formatPrice(report.orders ? Math.round(report.revenue / report.orders) : 0) },
        ].map((s) => (
          <Card key={s.l}>
            <p className="text-sm text-muted">{s.l}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{s.v}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="mb-6 font-semibold">Omzet harian · {days} hari terakhir</h2>
        <RevenueChart days={series} />
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted">Lihat sebagai tabel</summary>
          <table className="mt-3 w-full max-w-md">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 font-medium">Tanggal</th>
                <th className="py-1 text-right font-medium">Pesanan</th>
                <th className="py-1 text-right font-medium">Omzet</th>
              </tr>
            </thead>
            <tbody>
              {series.filter((d) => d.orders > 0).map((d) => (
                <tr key={d.day} className="border-t border-line/60">
                  <td className="py-1">{d.day}</td>
                  <td className="py-1 text-right tabular-nums">{d.orders}</td>
                  <td className="py-1 text-right tabular-nums">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>

      <Card className="mt-6">
        <h2 className="mb-3 font-semibold">Produk terlaris</h2>
        {report.best.length === 0 ? (
          <p className="text-sm text-muted">Belum ada data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-2 font-medium">Produk</th>
                <th className="py-2 text-right font-medium">Terjual</th>
                <th className="py-2 text-right font-medium">Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              {report.best.map((b) => (
                <tr key={b.name} className="border-t border-line/60">
                  <td className="py-2">{b.name}</td>
                  <td className="py-2 text-right tabular-nums">{b.qty}</td>
                  <td className="py-2 text-right tabular-nums">{formatPrice(b.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
