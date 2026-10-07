"use client";

import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/admin/ui";
import { toast } from "@/components/ui/toast";
import { addImageAction, createImageUploadAction, deleteImageAction, reorderImagesAction } from "@/lib/actions/admin-products";

export function ImageManager({ productId, images }: { productId: string; images: { id: string; url: string }[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);

  function upload(files: FileList | null) {
    if (!files?.length) return;
    start(async () => {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const list = Array.from(files);
      for (const [i, file] of list.entries()) {
        setProgress(`Mengunggah ${i + 1}/${list.length}…`);
        const ticket = await createImageUploadAction(productId, file.type, file.size);
        if (!ticket.ok) {
          toast(ticket.error, "error");
          continue;
        }
        const { error } = await supabase.storage.from("product-images").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
        if (error) {
          toast(`Gagal upload ${file.name}`, "error");
          continue;
        }
        await addImageAction(productId, ticket.path);
      }
      setProgress(null);
      toast("Foto ditambahkan");
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function move(index: number, dir: -1 | 1) {
    const ids = images.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    start(async () => {
      const res = await reorderImagesAction(productId, ids);
      if (!res.ok) toast(res.error, "error");
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Foto</h2>
        <span className="text-xs text-muted">Foto pertama = cover</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <div key={img.id} className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-2">
            <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
            {i === 0 && <span className="absolute top-1 left-1 rounded bg-primary px-1.5 text-[10px] font-bold">COVER</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 p-1">
              <button type="button" aria-label="Geser kiri" disabled={pending || i === 0} onClick={() => move(i, -1)} className="grid size-7 place-items-center rounded disabled:opacity-30">
                <ArrowLeft className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Hapus foto"
                disabled={pending}
                onClick={() => confirm("Hapus foto ini?") && start(async () => void (await deleteImageAction(img.id)))}
                className="grid size-7 place-items-center rounded text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
              <button type="button" aria-label="Geser kanan" disabled={pending || i === images.length - 1} onClick={() => move(i, 1)} className="grid size-7 place-items-center rounded disabled:opacity-30">
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs text-muted hover:border-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
          {pending ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          {progress ?? "Tambah foto"}
          <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={pending} onChange={(e) => upload(e.target.files)} />
        </label>
      </div>
    </Card>
  );
}
