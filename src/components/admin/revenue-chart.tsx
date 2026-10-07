"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

// Single series → one hue, no legend (the title names it). #3b93e0 is the brand-blue
// step that passes the dataviz validator against the dark surface (#141821).
const BAR = "#3b93e0";

type Day = { day: string; revenue: number; orders: number };

const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}jt` : n >= 1000 ? `${Math.round(n / 1000)}rb` : String(n));

export function RevenueChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const h = 200;

  if (days.every((d) => d.revenue === 0)) {
    return <p className="py-16 text-center text-sm text-muted">Belum ada penjualan di periode ini.</p>;
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* y-axis: recessive ink, three ticks */}
        <div className="flex flex-col justify-between pb-6 text-right text-[11px] text-muted tabular-nums" style={{ height: h + 24 }}>
          {[...ticks].reverse().map((t) => (
            <span key={t}>{short(t)}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: h }}>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-line/50" style={{ bottom: `${(t / max) * 100}%` }} />
            ))}
          </div>
          <div className="relative flex items-end gap-[2px]" style={{ height: h }} role="list" aria-label="Omzet harian">
            {days.map((d, i) => (
              <div
                key={d.day}
                role="listitem"
                tabIndex={0}
                aria-label={`${d.day}: ${formatPrice(d.revenue)}, ${d.orders} pesanan`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="group flex h-full flex-1 cursor-default items-end outline-none"
              >
                <div
                  className="w-full rounded-t-[4px] transition-opacity group-focus-visible:outline-2 group-focus-visible:outline-accent"
                  style={{
                    height: d.revenue ? `max(2px, ${(d.revenue / max) * 100}%)` : 0,
                    background: BAR,
                    opacity: hover === null || hover === i ? 1 : 0.45,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted">
            <span>{days[0]?.day.slice(5)}</span>
            <span>{days.at(-1)?.day.slice(5)}</span>
          </div>
          {hover !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs whitespace-nowrap shadow-lg"
              style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}
            >
              <p className="text-muted">{days[hover].day}</p>
              <p className="font-semibold text-fg">{formatPrice(days[hover].revenue)}</p>
              <p className="text-muted">{days[hover].orders} pesanan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
