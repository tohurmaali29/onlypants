"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Package, Truck, UserCheck } from "lucide-react";
import { Card, Field } from "@/components/admin/ui";
import { PhotoUploader, type UploadedPhoto } from "@/components/admin/photo-uploader";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  markCompletedAction,
  markProcessingAction,
  packingAction,
  shippingAction,
  takeOverAction,
  updateTrackingAction,
  type ActionResult,
} from "@/lib/actions/admin-orders";
import type { OrderStatus } from "@/lib/db/schema";

export type FulfillmentProps = {
  orderId: string;
  status: OrderStatus;
  meId: string;
  assignee: { id: string; name: string } | null;
  packed: boolean;
  courier: string | null;
  trackingNumber: string | null;
};

const COURIERS = ["JNE REG", "JNE YES", "J&T Express", "SiCepat REG", "AnterAja", "Pos Indonesia", "GoSend", "GrabExpress", "Ambil di toko"];

export function FulfillmentPanel({ orderId, status, meId, assignee, packed, courier: initialCourier, trackingNumber }: FulfillmentProps) {
  const [pending, start] = useTransition();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [note, setNote] = useState("");
  const [courier, setCourier] = useState(initialCourier ?? "JNE REG");
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [confirmTakeOver, setConfirmTakeOver] = useState(false);
  const someoneElse = !!assignee && assignee.id !== meId;

  const exec = (fn: () => Promise<ActionResult>, success: string, reset = false) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast(r.error, "error");
      toast(success);
      if (reset) {
        setPhotos([]);
        setNote("");
        setConfirmTakeOver(false);
      }
    });

  const takeOverNotice =
    someoneElse ? (
      <label className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
        <input type="checkbox" checked={confirmTakeOver} onChange={(e) => setConfirmTakeOver(e.target.checked)} className="mt-0.5 size-4" />
        <span>
          Pesanan ini dipegang <strong>{assignee!.name}</strong>. Centang untuk <strong>mengambil alih</strong>. Tercatat atas nama kamu, dengan
          tanda diambil alih dari {assignee!.name}.
        </span>
      </label>
    ) : null;

  if (status === "paid") {
    return (
      <Card className="border-primary">
        <h2 className="mb-1 font-semibold">3. Kemas pesanan</h2>
        <p className="mb-4 text-sm text-muted">Yang menekan tombol ini jadi PIC pesanan.</p>
        <Button disabled={pending} onClick={() => exec(() => markProcessingAction(orderId), "Kamu jadi PIC pesanan ini")}>
          <Package className="size-4" /> Mulai kemas
        </Button>
      </Card>
    );
  }

  if (status === "processing") {
    return (
      <Card className="border-primary">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{packed ? "4. Kirim & bukti pengiriman" : "3. Bukti packing"}</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">PIC:</span>
            <span className="font-medium">{assignee ? (assignee.id === meId ? `${assignee.name} (kamu)` : assignee.name) : "—"}</span>
            {someoneElse && (
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => confirm(`Ambil alih pesanan dari ${assignee!.name}?`) && exec(() => takeOverAction(orderId), "Pesanan diambil alih")}>
                <UserCheck className="size-4" /> Ambil alih
              </Button>
            )}
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (someoneElse && !confirmTakeOver) return toast("Centang konfirmasi ambil alih dulu", "error");
            const proof = { photos: photos.map((p) => p.path), note, takeOver: someoneElse };
            if (!packed) exec(() => packingAction(orderId, proof), "Bukti packing tersimpan", true);
            else exec(() => shippingAction(orderId, { ...proof, tracking, courier }), "Terkirim, customer dinotifikasi", true);
          }}
        >
          {packed && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Kurir">
                <input list="couriers-ff" value={courier} onChange={(e) => setCourier(e.target.value)} className="input-field" required />
                <datalist id="couriers-ff">
                  {COURIERS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Nomor resi">
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} className="input-field" required />
              </Field>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium">{packed ? "Foto paket diserahkan ke kurir / struk resi" : "Foto barang & paket setelah dikemas"}</p>
            <PhotoUploader orderId={orderId} stage={packed ? "shipping" : "packing"} photos={photos} onChange={setPhotos} />
            <p className="mt-1 text-xs text-muted">Minimal 1 foto, maksimal 6. Foto ini juga terlihat oleh customer.</p>
          </div>
          <Field label="Keterangan (internal)">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={packed ? "Mis. drop di JNE Kemang" : "Mis. bubble wrap 2 lapis"} className="input-field" />
          </Field>
          {takeOverNotice}
          <Button type="submit" disabled={pending || photos.length === 0}>
            {packed ? <Truck className="size-4" /> : <CheckCircle2 className="size-4" />} {packed ? "Kirim pesanan" : "Simpan bukti packing"}
          </Button>
        </form>
      </Card>
    );
  }

  if (status === "shipped") {
    return (
      <Card>
        <h2 className="mb-3 font-semibold">Ubah resi</h2>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            exec(() => updateTrackingAction(orderId, { tracking, courier }), "Resi diperbarui & customer dinotifikasi");
          }}
        >
          <Field label="Kurir">
            <input value={courier} onChange={(e) => setCourier(e.target.value)} className="input-field" required />
          </Field>
          <Field label="Nomor resi">
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} className="input-field" required />
          </Field>
          <Button type="submit" variant="secondary" disabled={pending}>
            Simpan
          </Button>
        </form>
        <Button className="mt-4" disabled={pending} onClick={() => exec(() => markCompletedAction(orderId), "Pesanan selesai")}>
          Tandai selesai
        </Button>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <AlertTriangle className="size-3.5" /> Otomatis selesai 14 hari setelah dikirim.
        </p>
      </Card>
    );
  }

  return null;
}
