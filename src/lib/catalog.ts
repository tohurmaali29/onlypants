import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";

export const CATALOG_TAG = "catalog";

const { products, productImages, variants, categories } = schema;

export type CatalogVariant = {
  id: string;
  sizeLabel: string;
  available: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  type: "thrift" | "merch";
  category: { slug: string; nameId: string; nameEn: string };
  nameId: string;
  nameEn: string;
  descriptionId: string;
  descriptionEn: string;
  price: number;
  compareAtPrice: number | null;
  conditionScore: number | null;
  conditionNoteId: string;
  conditionNoteEn: string;
  measurements: Record<string, number | undefined>;
  featured: boolean;
  createdAt: string;
  images: { url: string; alt: string }[];
  variants: CatalogVariant[];
  available: number;
};

/**
 * Every active product with images and available stock. The catalog is small
 * (tens to a few hundred items), so one cached read feeds every storefront page.
 * Mutations that touch products or stock call updateTag/revalidateTag(CATALOG_TAG).
 */
export async function getCatalog(): Promise<CatalogProduct[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.status, "active"))
    .orderBy(asc(products.createdAt));

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.product.id);
  const [images, vars] = await Promise.all([
    db.select().from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.sort)),
    db.select().from(variants).where(inArray(variants.productId, ids)).orderBy(asc(variants.sort)),
  ]);

  return rows
    .map(({ product: p, category: c }) => {
      const pv = vars
        .filter((v) => v.productId === p.id)
        .map((v) => ({ id: v.id, sizeLabel: v.sizeLabel, available: Math.max(0, v.stockOnHand - v.reserved) }));
      return {
        id: p.id,
        slug: p.slug,
        type: p.type,
        category: { slug: c.slug, nameId: c.nameId, nameEn: c.nameEn },
        nameId: p.nameId,
        nameEn: p.nameEn,
        descriptionId: p.descriptionId,
        descriptionEn: p.descriptionEn,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        conditionScore: p.conditionScore,
        conditionNoteId: p.conditionNoteId,
        conditionNoteEn: p.conditionNoteEn,
        measurements: p.measurements,
        featured: p.featured,
        createdAt: p.createdAt.toISOString(),
        images: images.filter((i) => i.productId === p.id).map((i) => ({ url: i.url, alt: i.alt })),
        variants: pv,
        available: pv.reduce((n, v) => n + v.available, 0),
      };
    })
    .reverse(); // newest first
}

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  return db.select().from(categories).orderBy(asc(categories.sort));
}

export async function getProduct(slug: string) {
  const catalog = await getCatalog();
  return catalog.find((p) => p.slug === slug) ?? null;
}

/** Live (uncached) availability for a set of variants — used by cart validation. */
export async function getLiveVariants(variantIds: string[]) {
  if (variantIds.length === 0) return [];
  return db
    .select({
      id: variants.id,
      productId: variants.productId,
      sizeLabel: variants.sizeLabel,
      stockOnHand: variants.stockOnHand,
      reserved: variants.reserved,
      price: products.price,
      nameId: products.nameId,
      nameEn: products.nameEn,
      slug: products.slug,
    })
    .from(variants)
    .innerJoin(products, and(eq(products.id, variants.productId), eq(products.status, "active")))
    .where(inArray(variants.id, variantIds));
}

export const localized = {
  name: (p: Pick<CatalogProduct, "nameId" | "nameEn">, l: Locale) => (l === "en" ? p.nameEn : p.nameId),
  description: (p: Pick<CatalogProduct, "descriptionId" | "descriptionEn">, l: Locale) =>
    l === "en" ? p.descriptionEn : p.descriptionId,
  conditionNote: (p: Pick<CatalogProduct, "conditionNoteId" | "conditionNoteEn">, l: Locale) =>
    l === "en" ? p.conditionNoteEn : p.conditionNoteId,
  category: (c: { nameId: string; nameEn: string }, l: Locale) => (l === "en" ? c.nameEn : c.nameId),
};
