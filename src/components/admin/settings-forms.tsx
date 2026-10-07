"use client";

import { createClient } from "@supabase/supabase-js";
import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import { Card, Field } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { createQrisUploadAction, qrisPublicUrlAction, saveSettingsAction } from "@/lib/actions/admin-settings";
import type { Settings } from "@/lib/settings";

function useSave() {
  const [pending, start] = useTransition();
  const save = (key: keyof Settings, value: unknown) =>
    start(async () => {
      const r = await saveSettingsAction(key, value);
      if (r.ok) toast("Tersimpan");
      else toast(r.error, "error");
    });
  return { pending, save };
}

export function SettingsForms({ settings }: { settings: Settings }) {
  const [store, setStore] = useState(settings.store);
  const [payment, setPayment] = useState(settings.payment);
  const [timeouts, setTimeouts] = useState(settings.timeouts);
  const [uploading, setUploading] = useState(false);
  const { pending, save } = useSave();

  async function uploadQris(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const t = await createQrisUploadAction(file.type, file.size);
      if (!t.ok) return toast(t.error, "error");
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { error } = await supabase.storage.from("store-assets").uploadToSignedUrl(t.path, t.token, file, { contentType: file.type });
      if (error) return toast("Upload gagal", "error");
      const url = await qrisPublicUrlAction(t.path);
      if (url) {
        setPayment((p) => ({ ...p, qris_image_url: url }));
        toast("QRIS terunggah. Jangan lupa klik Simpan.");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className={payment.is_dummy ? "border-warning" : ""}>
        <h2 className="mb-1 font-semibold">Pembayaran QRIS</h2>
        {payment.is_dummy && (
          <p className="mb-4 flex items-start gap-2 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Masih QRIS contoh. Upload QRIS asli toko lalu matikan mode demo sebelum launch.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div>
            {payment.qris_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview of an arbitrary uploaded URL
              <img src={payment.qris_image_url} alt="QRIS" className="w-full rounded-xl bg-white p-2" />
            ) : (
              <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-line text-xs text-muted">Belum ada</div>
            )}
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line py-1.5 text-xs hover:border-accent">
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Upload QRIS
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => uploadQris(e.target.files?.[0])} />
            </label>
          </div>
          <div className="space-y-4">
            <Field label="Nama merchant (sesuai QRIS)">
              <input className="input-field" value={payment.merchant_name} onChange={(e) => setPayment({ ...payment, merchant_name: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={payment.is_dummy} onChange={(e) => setPayment({ ...payment, is_dummy: e.target.checked })} className="size-4" />
              Mode demo (tampilkan peringatan “jangan dibayar”)
            </label>
            <Button disabled={pending || uploading} onClick={() => save("payment", payment)}>
              Simpan
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Info toko</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama toko">
            <input className="input-field" value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
          </Field>
          <Field label="WhatsApp toko" hint="Dipakai tombol chat di toko">
            <input className="input-field" value={store.whatsapp} onChange={(e) => setStore({ ...store, whatsapp: e.target.value })} />
          </Field>
          <Field label="Email toko">
            <input type="email" className="input-field" value={store.email} onChange={(e) => setStore({ ...store, email: e.target.value })} />
          </Field>
          <Field label="Instagram">
            <input className="input-field" value={store.instagram} onChange={(e) => setStore({ ...store, instagram: e.target.value })} />
          </Field>
          <Field label="Alamat" className="sm:col-span-2">
            <input className="input-field" value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} />
          </Field>
          <Field label="Jam operasional">
            <input className="input-field" value={store.hours} onChange={(e) => setStore({ ...store, hours: e.target.value })} />
          </Field>
        </div>
        <Button className="mt-4" disabled={pending} onClick={() => save("store", store)}>
          Simpan
        </Button>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Batas waktu</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Batas input ongkir (jam)" hint="Pesanan batal otomatis jika ongkir belum diisi">
            <input type="number" min={1} max={168} className="input-field" value={timeouts.quote_hours} onChange={(e) => setTimeouts({ ...timeouts, quote_hours: Number(e.target.value) })} />
          </Field>
          <Field label="Batas bayar (jam)" hint="Dihitung sejak ongkir dikirim">
            <input type="number" min={1} max={72} className="input-field" value={timeouts.payment_hours} onChange={(e) => setTimeouts({ ...timeouts, payment_hours: Number(e.target.value) })} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted">Berlaku untuk pesanan baru.</p>
        <Button className="mt-4" disabled={pending} onClick={() => save("timeouts", timeouts)}>
          Simpan
        </Button>
      </Card>
    </div>
  );
}
