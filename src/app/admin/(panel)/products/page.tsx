import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { listProductsAdmin } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

// Reads the session on every request (see (panel)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Produk" };

const STATUS = { draft: "Draft", active: "Aktif", archived: "Arsip" } as const;

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireStaff();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const rows = await listProductsAdmin(q, status);

  return (
    <>
      <PageHeader title="Produk & Stok">
        <div className="flex w-full gap-2 sm:w-auto">
          <form className="relative flex-1 sm:w-64">
            {status && <input type="hidden" name="status" value={status} />}
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={q} placeholder="Cari produk" className="input-field py-2 pl-9" aria-label="Cari produk" />
          </form>
          <Link href="/admin/products/new" className={buttonVariants({ size: "sm", className: "h-10" })}>
            <Plus className="size-4" /> Tambah
          </Link>
        </div>
      </PageHeader>

      <div className="mb-4 flex gap-2">
        {[
          { v: undefined, l: "Draft & aktif" },
          { v: "active", l: "Aktif" },
          { v: "draft", l: "Draft" },
          { v: "archived", l: "Arsip" },
        ].map((t) => (
          <Link
            key={t.l}
            href={t.v ? `/admin/products?status=${t.v}` : "/admin/products"}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm", status === t.v ? "border-primary bg-primary text-white" : "border-line text-muted hover:text-fg")}
          >
            {t.l}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center text-muted">Tidak ada produk.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line">
          {rows.map((p) => {
            const avail = p.variants.reduce((n, v) => n + v.stockOnHand - v.reserved, 0);
            const held = p.variants.reduce((n, v) => n + v.reserved, 0);
            return (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface/60">
                  <div className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.nameId}</p>
                    <p className="text-xs text-muted">
                      {p.categoryName} · {p.type === "thrift" ? "Thrift" : "Merch"} · {p.variants.map((v) => `${v.sizeLabel}: ${v.stockOnHand - v.reserved}`).join(", ")}
                    </p>
                  </div>
                  <div className="hidden text-right text-sm sm:block">
                    <p className="tabular-nums">{formatPrice(p.price)}</p>
                    <p className={cn("text-xs", avail === 0 ? "text-danger" : "text-muted")}>
                      {avail === 0 ? "Habis" : `Tersedia ${avail}`}
                      {held > 0 && ` · di-hold ${held}`}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", p.status === "active" ? "bg-success/15 text-success" : "bg-surface-2 text-muted")}>
                    {STATUS[p.status]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
