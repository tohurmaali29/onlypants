"use client";

import { createClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { createFulfillmentUploadAction } from "@/lib/actions/admin-orders";

/** Downscale to max 1600px JPEG in the browser: phone photos are 3–8 MB, Storage free tier is 1 GB. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.8));
}

export type UploadedPhoto = { path: string; preview: string };

export function PhotoUploader({
  orderId,
  stage,
  photos,
  onChange,
  max = 6,
}: {
  orderId: string;
  stage: "packing" | "shipping";
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const next = [...photos];
    try {
      for (const file of Array.from(files).slice(0, max - photos.length)) {
        if (!file.type.startsWith("image/")) continue;
        const blob = await compress(file);
        const ticket = await createFulfillmentUploadAction(orderId, stage, blob.size);
        if (!ticket.ok) {
          toast(ticket.error, "error");
          continue;
        }
        const { error } = await supabase.storage
          .from("fulfillment-photos")
          .uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: "image/jpeg" });
        if (error) {
          toast(`Gagal upload ${file.name}`, "error");
          continue;
        }
        next.push({ path: ticket.path, preview: URL.createObjectURL(blob) });
        onChange([...next]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {photos.map((p, i) => (
        <div key={p.path} className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img src={p.preview} alt={`Foto ${i + 1}`} className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(photos.filter((x) => x.path !== p.path))}
            className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/70"
            aria-label={`Hapus foto ${i + 1}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {photos.length < max && (
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-center text-xs text-muted hover:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
          {busy ? "Mengunggah…" : "Foto"}
          {/* capture opens the camera directly on phones */}
          <input type="file" accept="image/*" capture="environment" multiple className="sr-only" disabled={busy} onChange={(e) => add(e.target.files)} />
        </label>
      )}
    </div>
  );
}
