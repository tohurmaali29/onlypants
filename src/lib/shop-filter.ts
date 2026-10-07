import type { CatalogProduct } from "./catalog";

export type ShopQuery = {
  q?: string;
  category?: string;
  type?: "thrift" | "merch";
  instock?: boolean;
  sort: "newest" | "price_asc" | "price_desc";
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseShopQuery(sp: Record<string, string | string[] | undefined>): ShopQuery {
  const type = one(sp.type);
  const sort = one(sp.sort);
  return {
    q: one(sp.q)?.trim().slice(0, 80) || undefined,
    category: one(sp.category) || undefined,
    type: type === "thrift" || type === "merch" ? type : undefined,
    instock: one(sp.instock) === "1",
    sort: sort === "price_asc" || sort === "price_desc" ? sort : "newest",
  };
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s]/g, "");

export function filterCatalog(items: CatalogProduct[], q: ShopQuery) {
  let out = items;
  if (q.category) out = out.filter((p) => p.category.slug === q.category);
  if (q.type) out = out.filter((p) => p.type === q.type);
  if (q.instock) out = out.filter((p) => p.available > 0);
  if (q.q) {
    const terms = norm(q.q).split(/\s+/).filter(Boolean);
    out = out.filter((p) => {
      const hay = norm(
        [p.nameId, p.nameEn, p.category.nameId, p.category.nameEn, p.descriptionId, p.descriptionEn].join(" "),
      );
      return terms.every((t) => hay.includes(t));
    });
  }
  const sorted = [...out];
  if (q.sort === "price_asc") sorted.sort((a, b) => a.price - b.price);
  else if (q.sort === "price_desc") sorted.sort((a, b) => b.price - a.price);
  // Sold-out items stay visible but sink to the bottom.
  return sorted.sort((a, b) => Number(b.available > 0) - Number(a.available > 0));
}

/** Build a /shop URL that changes one filter and keeps the rest. */
export function shopHref(locale: string, q: ShopQuery, patch: Partial<Record<keyof ShopQuery, string | undefined>>) {
  const params = new URLSearchParams();
  const merged: Record<string, string | undefined> = {
    q: q.q,
    category: q.category,
    type: q.type,
    instock: q.instock ? "1" : undefined,
    sort: q.sort === "newest" ? undefined : q.sort,
    ...patch,
  };
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const s = params.toString();
  return `/${locale}/shop${s ? `?${s}` : ""}`;
}
