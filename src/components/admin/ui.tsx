import type { OrderStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_quote: "Menunggu ongkir",
  awaiting_payment: "Menunggu bayar",
  payment_review: "Cek pembayaran",
  paid: "Dibayar",
  processing: "Dikemas",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

const STATUS_TONE: Record<OrderStatus, string> = {
  awaiting_quote: "bg-warning/15 text-warning",
  awaiting_payment: "bg-accent/15 text-accent",
  payment_review: "bg-primary text-white",
  paid: "bg-success/15 text-success",
  processing: "bg-success/15 text-success",
  shipped: "bg-surface-2 text-fg",
  completed: "bg-surface-2 text-muted",
  cancelled: "bg-danger/15 text-danger",
  expired: "bg-danger/15 text-danger",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", STATUS_TONE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl uppercase">{title}</h1>
      {children}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-5", className)}>{children}</section>;
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
