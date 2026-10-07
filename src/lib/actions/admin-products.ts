"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { db, schema } from "@/lib/db";
import { createServiceClient } from "@/lib/supabase/server";

const { products, variants, productImages, stockMovements, orderItems } = schema;
type Result = { ok: true; id?: string } | { ok: false; error: string };

const MEASUREMENT_KEYS = ["waist", "length", "inseam", "thigh", "leg_opening", "pit_to_pit", "sleeve", "width", "height", "depth", "insole"] as const;

const productSchema = z.object({
  id: z.uuid().optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug").max(80),
  type: z.enum(["thrift", "merch"]),
  categoryId: z.uuid(),
  nameId: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  descriptionId: z.string().trim().max(3000),
  descriptionEn: z.string().trim().max(3000),
  price: z.number().int().min(0).max(100_000_000),
  compareAtPrice: z.number().int().min(0).max(100_000_000).nullable(),
  conditionScore: z.number().int().min(1).max(10).nullable(),
  conditionNoteId: z.string().trim().max(500),
  conditionNoteEn: z.string().trim().max(500),
  measurements: z.partialRecord(z.enum(MEASUREMENT_KEYS), z.number().min(0).max(500)),
  status: z.enum(["draft", "active", "archived"]),
  featured: z.boolean(),
});
export type ProductInput = z.input<typeof productSchema>;

const FIELD_ERRORS: Record<string, string> = {
  slug: "Slug hanya huruf kecil, angka, dan tanda minus",
  nameId: "Nama (ID) minimal 2 huruf",
  nameEn: "Nama (EN) minimal 2 huruf",
  price: "Harga tidak valid",
  categoryId: "Pilih kategori",
};

export async function saveProductAction(input: ProductInput): Promise<Result> {
  const staff = await requireStaff();
  const p = productSchema.safeParse(input);
  if (!p.success) {
    const f = String(p.error.issues[0].path[0]);
    return { ok: false, error: FIELD_ERRORS[f] ?? `Isian ${f} tidak valid` };
  }
  const d = p.data;
  if (d.compareAtPrice != null && d.compareAtPrice <= d.price) return { ok: false, error: "Harga coret harus lebih besar dari harga jual" };

  const [clash] = await db.select({ id: products.id }).from(products).where(eq(products.slug, d.slug));
  if (clash && clash.id !== d.id) return { ok: false, error: "Slug sudah dipakai produk lain" };

  const values = {
    slug: d.slug,
    type: d.type,
    categoryId: d.categoryId,
    nameId: d.nameId,
    nameEn: d.nameEn,
    descriptionId: d.descriptionId,
    descriptionEn: d.descriptionEn,
    price: d.price,
    compareAtPrice: d.compareAtPrice,
    conditionScore: d.type === "thrift" ? d.conditionScore : null,
    conditionNoteId: d.conditionNoteId,
    conditionNoteEn: d.conditionNoteEn,
    measurements: d.measurements,
    status: d.status,
    featured: d.featured,
    updatedAt: new Date(),
  };

  let id = d.id;
  if (id) {
    await db.update(products).set(values).where(eq(products.id, id));
  } else {
    const [row] = await db.insert(products).values(values).returning({ id: products.id });
    id = row.id;
    // Thrift items are one of one: start them with a single size slot.
    if (d.type === "thrift") await db.insert(variants).values({ productId: id, sizeLabel: "One Size", stockOnHand: 0 });
  }
  await audit(staff.id, d.id ? "product.update" : "product.create", "product", id, { slug: d.slug, price: d.price, status: d.status });
  updateTag(CATALOG_TAG);
  if (d.id) refresh();
  return { ok: true, id };
}

export async function deleteProductAction(productId: string): Promise<Result> {
  const staff = await requireStaff("owner");
  const [{ n }] = await db.select({ n: count() }).from(orderItems).where(eq(orderItems.productId, productId));
  if (n > 0) return { ok: false, error: "Produk sudah pernah dipesan. Arsipkan saja supaya riwayat pesanan tetap utuh." };
  const imgs = await db.select().from(productImages).where(eq(productImages.productId, productId));
  await db.delete(products).where(eq(products.id, productId));
  const storagePaths = imgs.map((i) => storagePathFromUrl(i.url)).filter((x): x is string => !!x);
  if (storagePaths.length) await createServiceClient().storage.from("product-images").remove(storagePaths);
  await audit(staff.id, "product.delete", "product", productId);
  updateTag(CATALOG_TAG);
  redirect("/admin/products");
}

// ------------------------------------------------------------------ variants & stock

export async function saveVariantAction(input: { productId: string; id?: string; sizeLabel: string; sku?: string }): Promise<Result> {
  const staff = await requireStaff();
  const p = z
    .object({ productId: z.uuid(), id: z.uuid().optional(), sizeLabel: z.string().trim().min(1).max(30), sku: z.string().trim().max(40).optional() })
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Ukuran wajib diisi" };
  const { productId, id, sizeLabel, sku } = p.data;
  try {
    if (id) await db.update(variants).set({ sizeLabel, sku: sku || null }).where(and(eq(variants.id, id), eq(variants.productId, productId)));
    else {
      const [{ n }] = await db.select({ n: count() }).from(variants).where(eq(variants.productId, productId));
      await db.insert(variants).values({ productId, sizeLabel, sku: sku || null, sort: n });
    }
  } catch {
    return { ok: false, error: "Ukuran atau SKU sudah ada" };
  }
  await audit(staff.id, id ? "variant.update" : "variant.create", "product", productId, { sizeLabel });
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

export async function deleteVariantAction(variantId: string): Promise<Result> {
  const staff = await requireStaff();
  const [v] = await db.select().from(variants).where(eq(variants.id, variantId));
  if (!v) return { ok: false, error: "Varian tidak ditemukan" };
  const [{ n }] = await db.select({ n: count() }).from(orderItems).where(eq(orderItems.variantId, variantId));
  if (n > 0 || v.reserved > 0) return { ok: false, error: "Varian sudah pernah dipesan. Set stoknya ke 0 saja." };
  await db.delete(variants).where(eq(variants.id, variantId));
  await audit(staff.id, "variant.delete", "product", v.productId, { sizeLabel: v.sizeLabel });
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

/**
 * Restock (+n) or correct (±n) physical stock. Refuses to drop on-hand stock
 * below what open orders have reserved.
 */
export async function adjustStockAction(input: { variantId: string; delta: number; type: "restock" | "adjust"; note: string }): Promise<Result> {
  const staff = await requireStaff();
  const p = z
    .object({
      variantId: z.uuid(),
      delta: z.number().int().min(-1000).max(1000).refine((n) => n !== 0),
      type: z.enum(["restock", "adjust"]),
      note: z.string().trim().min(3).max(200),
    })
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Isi jumlah (bukan 0) dan alasan minimal 3 huruf" };
  const { variantId, delta, type, note } = p.data;
  if (type === "restock" && delta < 0) return { ok: false, error: "Restock harus positif. Pakai koreksi untuk mengurangi." };

  const done = await db.transaction(async (tx) => {
    const rows = await tx
      .update(variants)
      .set({ stockOnHand: sql`${variants.stockOnHand} + ${delta}` })
      .where(and(eq(variants.id, variantId), sql`${variants.stockOnHand} + ${delta} >= ${variants.reserved}`))
      .returning({ productId: variants.productId });
    if (!rows.length) return null;
    await tx.insert(stockMovements).values({ variantId, type, qty: delta, actorId: staff.id, note });
    return rows[0];
  });
  if (!done) return { ok: false, error: "Stok tidak boleh minus atau di bawah jumlah yang sedang di-hold pesanan" };
  await audit(staff.id, `stock.${type}`, "product", done.productId, { variantId, delta, note });
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ images

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

function storagePathFromUrl(url: string) {
  const marker = "/storage/v1/object/public/product-images/";
  const i = url.indexOf(marker);
  return i >= 0 ? url.slice(i + marker.length) : null;
}

export async function createImageUploadAction(productId: string, type: string, size: number) {
  await requireStaff();
  if (!z.uuid().safeParse(productId).success || !IMAGE_TYPES[type] || size > 8 * 1024 * 1024)
    return { ok: false as const, error: "Foto harus JPG/PNG/WEBP/AVIF maksimal 8 MB" };
  const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${IMAGE_TYPES[type]}`;
  const { data, error } = await createServiceClient().storage.from("product-images").createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Gagal menyiapkan upload" };
  return { ok: true as const, path, token: data.token };
}

export async function addImageAction(productId: string, path: string): Promise<Result> {
  const staff = await requireStaff();
  if (!path.startsWith(`${productId}/`)) return { ok: false, error: "Path tidak valid" };
  const url = createServiceClient().storage.from("product-images").getPublicUrl(path).data.publicUrl;
  const [{ n }] = await db.select({ n: count() }).from(productImages).where(eq(productImages.productId, productId));
  const [p] = await db.select({ name: products.nameId }).from(products).where(eq(products.id, productId));
  await db.insert(productImages).values({ productId, url, alt: p?.name ?? "", sort: n });
  await audit(staff.id, "image.add", "product", productId);
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

export async function deleteImageAction(imageId: string): Promise<Result> {
  const staff = await requireStaff();
  const [img] = await db.delete(productImages).where(eq(productImages.id, imageId)).returning();
  if (!img) return { ok: false, error: "Foto tidak ditemukan" };
  const path = storagePathFromUrl(img.url);
  if (path) await createServiceClient().storage.from("product-images").remove([path]);
  // Re-number the remaining photos so the first one is always the cover.
  const rest = await db.select().from(productImages).where(eq(productImages.productId, img.productId)).orderBy(productImages.sort);
  await Promise.all(rest.map((r, i) => db.update(productImages).set({ sort: i }).where(eq(productImages.id, r.id))));
  await audit(staff.id, "image.delete", "product", img.productId);
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

export async function reorderImagesAction(productId: string, orderedIds: string[]): Promise<Result> {
  await requireStaff();
  const rows = await db.select({ id: productImages.id }).from(productImages).where(and(eq(productImages.productId, productId), inArray(productImages.id, orderedIds)));
  if (rows.length !== orderedIds.length) return { ok: false, error: "Foto tidak cocok" };
  await db.transaction(async (tx) => {
    for (const [i, id] of orderedIds.entries()) await tx.update(productImages).set({ sort: i }).where(eq(productImages.id, id));
  });
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}
