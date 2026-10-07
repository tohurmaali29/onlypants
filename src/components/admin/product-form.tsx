"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Card, Field } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { deleteProductAction, saveProductAction, type ProductInput } from "@/lib/actions/admin-products";

type Product = Omit<ProductInput, "measurements"> & { measurements: Record<string, number> };

const MEASUREMENTS: { key: string; label: string; for: ("pants" | "top" | "bag" | "shoe")[] }[] = [
  { key: "waist", label: "Lingkar pinggang", for: ["pants"] },
  { key: "length", label: "Panjang", for: ["pants", "top"] },
  { key: "inseam", label: "Inseam", for: ["pants"] },
  { key: "thigh", label: "Paha", for: ["pants"] },
  { key: "leg_opening", label: "Lebar bawah", for: ["pants"] },
  { key: "pit_to_pit", label: "Lebar dada", for: ["top"] },
  { key: "sleeve", label: "Panjang lengan", for: ["top"] },
  { key: "width", label: "Lebar", for: ["bag"] },
  { key: "height", label: "Tinggi", for: ["bag"] },
  { key: "depth", label: "Tebal", for: ["bag"] },
  { key: "insole", label: "Insole", for: ["shoe"] },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const empty: Product = {
  slug: "",
  type: "thrift",
  categoryId: "",
  nameId: "",
  nameEn: "",
  descriptionId: "",
  descriptionEn: "",
  price: 0,
  compareAtPrice: null,
  conditionScore: 9,
  conditionNoteId: "",
  conditionNoteEn: "",
  measurements: {},
  status: "draft",
  featured: false,
};

export function ProductForm({
  product,
  categories,
  canDelete = false,
}: {
  product?: Product;
  categories: { id: string; name: string }[];
  canDelete?: boolean;
}) {
  const [v, setV] = useState<Product>(product ?? { ...empty, categoryId: categories[0]?.id ?? "" });
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof Product>(k: K, val: Product[K]) => setV((p) => ({ ...p, [k]: val }));
  const num = (s: string) => (s === "" ? null : Number(s));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await saveProductAction({ ...v, measurements: Object.fromEntries(Object.entries(v.measurements).filter(([, n]) => n > 0)) } as ProductInput);
      if (!res.ok) return toast(res.error, "error");
      toast("Produk disimpan");
      if (!product && res.id) {
        // Next.js keeps visited pages alive (Activity); start the "new" form fresh next time.
        setV({ ...empty, categoryId: categories[0]?.id ?? "" });
        setSlugTouched(false);
        router.push(`/admin/products/${res.id}?created=1`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <h2 className="mb-4 font-semibold">Info produk</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama (Indonesia)">
            <input
              className="input-field"
              value={v.nameId}
              required
              onChange={(e) => {
                set("nameId", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
                if (!product && (v.nameEn === "" || v.nameEn === v.nameId)) set("nameEn", e.target.value);
              }}
            />
          </Field>
          <Field label="Nama (English)">
            <input className="input-field" value={v.nameEn} required onChange={(e) => set("nameEn", e.target.value)} />
          </Field>
          <Field label="Slug (URL)" hint={`/p/${v.slug || "nama-produk"}`}>
            <input
              className="input-field"
              value={v.slug}
              required
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Kategori">
            <select className="input-field" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jenis" hint={v.type === "thrift" ? "1 pcs, stok per ukuran biasanya 1" : "Banyak ukuran, stok per ukuran"}>
            <select className="input-field" value={v.type} onChange={(e) => set("type", e.target.value as Product["type"])} disabled={!!product}>
              <option value="thrift">Thrift</option>
              <option value="merch">Merch</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="input-field" value={v.status} onChange={(e) => set("status", e.target.value as Product["status"])}>
              <option value="draft">Draft (tidak tampil)</option>
              <option value="active">Aktif (tampil di toko)</option>
              <option value="archived">Arsip</option>
            </select>
          </Field>
          <Field label="Harga (Rp)">
            <input type="number" min={0} step={1000} className="input-field" value={v.price || ""} required onChange={(e) => set("price", Number(e.target.value))} />
          </Field>
          <Field label="Harga coret (opsional)">
            <input type="number" min={0} step={1000} className="input-field" value={v.compareAtPrice ?? ""} onChange={(e) => set("compareAtPrice", num(e.target.value))} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} className="size-4" />
            Tampilkan sebagai unggulan
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Deskripsi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deskripsi (Indonesia)">
            <textarea rows={5} className="input-field" value={v.descriptionId} onChange={(e) => set("descriptionId", e.target.value)} />
          </Field>
          <Field label="Description (English)">
            <textarea rows={5} className="input-field" value={v.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
          </Field>
        </div>
      </Card>

      {v.type === "thrift" && (
        <Card>
          <h2 className="mb-4 font-semibold">Kondisi</h2>
          <div className="grid gap-4 sm:grid-cols-[140px_1fr_1fr]">
            <Field label="Skor (1–10)">
              <input type="number" min={1} max={10} className="input-field" value={v.conditionScore ?? ""} onChange={(e) => set("conditionScore", num(e.target.value))} />
            </Field>
            <Field label="Catatan minus (ID)">
              <input className="input-field" value={v.conditionNoteId} onChange={(e) => set("conditionNoteId", e.target.value)} />
            </Field>
            <Field label="Condition note (EN)">
              <input className="input-field" value={v.conditionNoteEn} onChange={(e) => set("conditionNoteEn", e.target.value)} />
            </Field>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 font-semibold">Ukuran detail (cm)</h2>
        <p className="mb-4 text-xs text-muted">Kosongkan yang tidak relevan.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MEASUREMENTS.map((m) => (
            <Field key={m.key} label={m.label}>
              <input
                type="number"
                min={0}
                step={0.5}
                className="input-field"
                value={v.measurements[m.key] ?? ""}
                onChange={(e) => {
                  const n = num(e.target.value);
                  setV((p) => {
                    const next = { ...p.measurements };
                    if (n == null) delete next[m.key];
                    else next[m.key] = n;
                    return { ...p, measurements: next };
                  });
                }}
              />
            </Field>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} {product ? "Simpan perubahan" : "Buat produk"}
        </Button>
        {product && canDelete && (
          <Button
            type="button"
            variant="ghost"
            className="text-danger"
            disabled={pending}
            onClick={() => {
              if (confirm("Hapus permanen produk ini beserta fotonya?"))
                start(async () => {
                  const res = await deleteProductAction(product.id!);
                  if (res && !res.ok) toast(res.error, "error");
                });
            }}
          >
            <Trash2 className="size-4" /> Hapus permanen
          </Button>
        )}
      </div>
    </form>
  );
}
