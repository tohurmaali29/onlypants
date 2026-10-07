"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { adjustStockAction, deleteVariantAction, saveVariantAction } from "@/lib/actions/admin-products";

type V = { id: string; sizeLabel: string; sku: string | null; stockOnHand: number; reserved: number };

function VariantRow({ v, productId }: { v: V; productId: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<"restock" | "adjust" | null>(null);
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [label, setLabel] = useState(v.sizeLabel);

  const submit = () =>
    start(async () => {
      const n = Number(qty);
      const delta = open === "restock" ? Math.abs(n) : n;
      const res = await adjustStockAction({ variantId: v.id, delta, type: open!, note: note || (open === "restock" ? "restock" : "") });
      if (res.ok) {
        toast("Stok diperbarui");
        setOpen(null);
        setNote("");
        setQty("1");
      } else toast(res.error, "error");
    });

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() =>
            label.trim() &&
            label !== v.sizeLabel &&
            start(async () => {
              const r = await saveVariantAction({ productId, id: v.id, sizeLabel: label });
              if (!r.ok) {
                toast(r.error, "error");
                setLabel(v.sizeLabel);
              }
            })
          }
          className="input-field w-28 py-1.5 text-sm"
          aria-label="Ukuran"
        />
        <div className="flex-1 text-sm">
          <span className="font-semibold tabular-nums">{v.stockOnHand - v.reserved}</span> <span className="text-muted">tersedia</span>
          <p className="text-xs text-muted">
            fisik {v.stockOnHand}
            {v.reserved > 0 && ` · di-hold ${v.reserved}`}
          </p>
        </div>
        <button type="button" onClick={() => setOpen(open === "restock" ? null : "restock")} className="grid size-8 place-items-center rounded-full border border-line hover:border-accent" aria-label={`Restock ${v.sizeLabel}`}>
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => setOpen(open === "adjust" ? null : "adjust")} className="grid size-8 place-items-center rounded-full border border-line hover:border-accent" aria-label={`Koreksi stok ${v.sizeLabel}`}>
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => confirm(`Hapus ukuran ${v.sizeLabel}?`) && start(async () => {
            const r = await deleteVariantAction(v.id);
            if (!r.ok) toast(r.error, "error");
          })}
          className="grid size-8 place-items-center rounded-full text-muted hover:text-danger"
          aria-label={`Hapus ukuran ${v.sizeLabel}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {open && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-surface-2 p-3">
          <label className="text-xs">
            <span className="mb-1 block text-muted">{open === "restock" ? "Tambah" : "Koreksi (±)"}</span>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="input-field w-24 py-1.5" />
          </label>
          <label className="min-w-40 flex-1 text-xs">
            <span className="mb-1 block text-muted">Alasan</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={open === "restock" ? "Barang masuk" : "Mis. cacat, hilang, salah hitung"} className="input-field py-1.5" />
          </label>
          <Button size="sm" type="button" disabled={pending} onClick={submit}>
            Simpan
          </Button>
        </div>
      )}
    </li>
  );
}

export function StockManager({ productId, type, variants }: { productId: string; type: "thrift" | "merch"; variants: V[] }) {
  const [pending, start] = useTransition();
  const [size, setSize] = useState("");
  return (
    <Card>
      <h2 className="font-semibold">Ukuran & stok</h2>
      <p className="mt-1 text-xs text-muted">{type === "thrift" ? "Barang thrift: biasanya 1 ukuran dengan stok 1." : "Tambah ukuran lalu restock masing-masing."}</p>
      <ul className="divide-y divide-line">
        {variants.map((v) => (
          <VariantRow key={v.id} v={v} productId={productId} />
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveVariantAction({ productId, sizeLabel: size });
            if (r.ok) setSize("");
            else toast(r.error, "error");
          });
        }}
      >
        <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Ukuran baru (mis. XL, W32 L30)" className="input-field flex-1 py-2" aria-label="Ukuran baru" />
        <Button size="sm" type="submit" variant="secondary" disabled={pending || !size.trim()} className="h-10">
          Tambah
        </Button>
      </form>
    </Card>
  );
}
