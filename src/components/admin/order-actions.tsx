"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { FulfillmentPanel, type FulfillmentProps } from "@/components/admin/fulfillment-panel";
import { Card, Field } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  approvePaymentAction,
  cancelOrderAction,
  proofUrlAction,
  rejectPaymentAction,
  saveInternalNoteAction,
  setShippingAction,
  type ActionResult,
} from "@/lib/actions/admin-orders";
import type { OrderStatus } from "@/lib/db/schema";
import { formatDateTime, formatPrice } from "@/lib/format";

type Props = {
  order: {
    id: string;
    status: OrderStatus;
    subtotal: number;
    shippingCost: number | null;
    courier: string | null;
    total: number | null;
    uniqueCode: number | null;
    trackingNumber: string | null;
    paymentDeadline: string | null;
    quoteDeadline: string;
    internalNote: string;
  };
  proofs: { id: string; path: string; status: "pending" | "approved" | "rejected"; note: string | null; createdAt: string }[];
  fulfillment: FulfillmentProps;
};

const COURIERS = ["JNE REG", "JNE YES", "J&T Express", "SiCepat REG", "AnterAja", "Pos Indonesia", "GoSend", "GrabExpress", "Ambil di toko"];

function useAction() {
  const [pending, start] = useTransition();
  const exec = (fn: () => Promise<ActionResult>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast(success);
        after?.();
      } else toast(res.error, "error");
    });
  return { pending, exec };
}

export function OrderActions({ order, proofs, fulfillment }: Props) {
  const { pending, exec } = useAction();
  const s = order.status;
  const [cost, setCost] = useState(order.shippingCost?.toString() ?? "");
  const [courier, setCourier] = useState(order.courier ?? "JNE REG");
  const [rejectNote, setRejectNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [note, setNote] = useState(order.internalNote);
  const pendingProof = proofs.find((p) => p.status === "pending");

  async function openProof(path: string) {
    const url = await proofUrlAction(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast("Gagal membuka bukti bayar", "error");
  }

  return (
    <div className="space-y-6">
      {(s === "awaiting_quote" || s === "awaiting_payment") && (
        <Card className={s === "awaiting_quote" ? "border-primary" : ""}>
          <h2 className="mb-1 font-semibold">{s === "awaiting_quote" ? "1. Input ongkir" : "Ubah ongkir"}</h2>
          <p className="mb-4 text-xs text-muted">
            {s === "awaiting_quote"
              ? `Pesanan otomatis batal ${formatDateTime(order.quoteDeadline)} kalau ongkir belum diisi.`
              : "Mengubah ongkir tidak memperpanjang batas bayar."}
          </p>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              exec(() => setShippingAction(order.id, { cost: Number(cost), courier }), "Ongkir disimpan & customer dinotifikasi");
            }}
          >
            <Field label="Kurir">
              <input list="couriers" value={courier} onChange={(e) => setCourier(e.target.value)} className="input-field" required />
              <datalist id="couriers">
                {COURIERS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Ongkir (Rp)">
              <input type="number" inputMode="numeric" min={0} step={500} value={cost} onChange={(e) => setCost(e.target.value)} className="input-field" required />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Simpan
            </Button>
          </form>
          {cost !== "" && (
            <p className="mt-3 text-sm text-muted">
              Total customer: {formatPrice(order.subtotal + Number(cost))} + kode unik {order.uniqueCode ?? "(dibuat otomatis)"}
            </p>
          )}
        </Card>
      )}

      {(s === "payment_review" || s === "awaiting_payment") && order.total != null && (
        <Card className={s === "payment_review" ? "border-primary" : ""}>
          <h2 className="mb-1 font-semibold">2. Verifikasi pembayaran</h2>
          <p className="mb-4 text-sm">
            Cocokkan mutasi QRIS dengan nominal <strong className="text-accent">{formatPrice(order.total)}</strong>
            {order.paymentDeadline && <span className="text-muted"> · batas {formatDateTime(order.paymentDeadline)}</span>}
          </p>
          {proofs.length > 0 && (
            <ul className="mb-4 space-y-2">
              {proofs.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  <button onClick={() => openProof(p.path)} className="inline-flex items-center gap-1 text-accent hover:underline">
                    Lihat bukti <ExternalLink className="size-3.5" />
                  </button>
                  <span className="text-xs text-muted">{formatDateTime(p.createdAt)}</span>
                  <span className="ml-auto text-xs capitalize">
                    {p.status === "pending" ? "menunggu" : p.status === "approved" ? "disetujui" : `ditolak${p.note && p.note !== "superseded" ? `: ${p.note}` : ""}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!pendingProof && s === "awaiting_payment" && (
            <p className="mb-4 text-sm text-muted">Belum ada bukti bayar. Kalau customer kirim via WA dan dana sudah masuk, tetap bisa disetujui.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() => {
                if (confirm(`Dana ${formatPrice(order.total!)} sudah masuk di mutasi?`))
                  exec(() => approvePaymentAction(order.id), "Pembayaran disetujui");
              }}
            >
              <CheckCircle2 className="size-4" /> Setujui
            </Button>
          </div>
          {pendingProof && (
            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                exec(() => rejectPaymentAction(order.id, rejectNote), "Bukti ditolak, customer dinotifikasi", () => setRejectNote(""));
              }}
            >
              <input
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Alasan tolak (mis. nominal tidak sesuai)"
                className="input-field flex-1"
                aria-label="Alasan penolakan"
              />
              <Button type="submit" variant="secondary" disabled={pending}>
                <XCircle className="size-4" /> Tolak
              </Button>
            </form>
          )}
        </Card>
      )}

      <FulfillmentPanel {...fulfillment} />

      {!["shipped", "completed", "cancelled", "expired"].includes(s) && (
        <details className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <summary className="cursor-pointer text-sm font-semibold text-danger">Batalkan pesanan</summary>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (confirm("Yakin batalkan pesanan ini?"))
                exec(() => cancelOrderAction(order.id, { reason: cancelReason, restock }), "Pesanan dibatalkan");
            }}
          >
            <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Alasan pembatalan" className="input-field" required aria-label="Alasan pembatalan" />
            {(s === "paid" || s === "processing") && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="size-4" />
                Kembalikan barang ke stok (refund dilakukan manual)
              </label>
            )}
            <Button type="submit" variant="danger" disabled={pending}>
              Batalkan
            </Button>
          </form>
        </details>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">Catatan internal</h2>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input-field" aria-label="Catatan internal" placeholder="Hanya terlihat oleh admin" />
        <Button variant="secondary" size="sm" className="mt-2" disabled={pending || note === order.internalNote} onClick={() => exec(() => saveInternalNoteAction(order.id, note), "Catatan disimpan")}>
          Simpan catatan
        </Button>
      </Card>
    </div>
  );
}
