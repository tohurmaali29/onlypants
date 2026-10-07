import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { ImageManager } from "@/components/admin/image-manager";
import { ProductForm } from "@/components/admin/product-form";
import { StockManager } from "@/components/admin/stock-manager";
import { Card } from "@/components/admin/ui";
import { getProductAdmin } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { getCategories } from "@/lib/catalog";
import { formatDateTime } from "@/lib/format";

// Reads the session on every request (see (panel)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Edit produk" };

const MOVE_LABEL = { restock: "Restock", adjust: "Koreksi", reserve: "Di-hold", release: "Dilepas", sale: "Terjual", return: "Retur" } as const;

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [data, categories, sp] = await Promise.all([getProductAdmin(id), getCategories(), searchParams]);
  if (!data) notFound();
  const { product: p, variants, images, movements } = data;

  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Produk
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl uppercase">{p.nameId}</h1>
        {p.status === "active" && (
          <Link href={`/id/p/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
            Lihat di toko <ExternalLink className="size-3.5" />
          </Link>
        )}
      </div>
      {sp.created && <p className="mb-6 rounded-xl border border-success/40 bg-success/10 p-3 text-sm">Produk dibuat. Sekarang tambahkan foto dan stok, lalu ubah status ke Aktif.</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <ProductForm
          categories={categories.map((c) => ({ id: c.id, name: c.nameId }))}
          canDelete={staff.role === "owner"}
          product={{
            id: p.id,
            slug: p.slug,
            type: p.type,
            categoryId: p.categoryId,
            nameId: p.nameId,
            nameEn: p.nameEn,
            descriptionId: p.descriptionId,
            descriptionEn: p.descriptionEn,
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            conditionScore: p.conditionScore,
            conditionNoteId: p.conditionNoteId,
            conditionNoteEn: p.conditionNoteEn,
            measurements: p.measurements as Record<string, number>,
            status: p.status,
            featured: p.featured,
          }}
        />
        <div className="space-y-6">
          <ImageManager productId={p.id} images={images.map((i) => ({ id: i.id, url: i.url }))} />
          <StockManager
            productId={p.id}
            type={p.type}
            variants={variants.map((v) => ({ id: v.id, sizeLabel: v.sizeLabel, sku: v.sku, stockOnHand: v.stockOnHand, reserved: v.reserved }))}
          />
          <Card>
            <h2 className="mb-3 font-semibold">Riwayat stok</h2>
            {movements.length === 0 ? (
              <p className="text-sm text-muted">Belum ada.</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
                {movements.map(({ m, size, actor, orderCode }) => (
                  <li key={m.id} className="flex justify-between gap-3 border-b border-line/60 pb-2">
                    <div>
                      <p>
                        {MOVE_LABEL[m.type]} · {size}{" "}
                        <span className={m.qty > 0 ? "text-success" : "text-danger"}>
                          {m.qty > 0 ? "+" : ""}
                          {m.qty}
                        </span>
                      </p>
                      <p className="text-xs text-muted">
                        {orderCode ? `${orderCode} · ` : ""}
                        {m.note} {actor ? `· ${actor}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{formatDateTime(m.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">“Di-hold/Dilepas” mengubah stok yang ditahan pesanan, bukan stok fisik.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
