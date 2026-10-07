import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { getCategories } from "@/lib/catalog";

// Reads the session on every request (see (panel)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Produk baru" };

export default async function NewProductPage() {
  await requireStaff();
  const categories = await getCategories();
  return (
    <>
      <PageHeader title="Produk baru" />
      <p className="mb-6 text-sm text-muted">Simpan dulu sebagai draft, lalu tambahkan foto, ukuran, dan stok.</p>
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.nameId }))} />
    </>
  );
}
