import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "./catalog";
import { filterCatalog, parseShopQuery, shopHref } from "./shop-filter";

const p = (over: Partial<CatalogProduct>): CatalogProduct =>
  ({
    id: over.slug,
    type: "thrift",
    category: { slug: "pants", nameId: "Celana", nameEn: "Pants" },
    nameId: "",
    nameEn: "",
    descriptionId: "",
    descriptionEn: "",
    price: 100,
    available: 1,
    ...over,
  }) as CatalogProduct;

const items = [
  p({ slug: "cargo", nameId: "Brown Cargo", price: 650 }),
  p({ slug: "sweat", nameId: "Gray Sweatpants", type: "merch", price: 249 }),
  p({ slug: "jacket", nameId: "Leather Jacket", price: 950, available: 0, category: { slug: "outerwear", nameId: "Outerwear", nameEn: "Outerwear" } }),
];

describe("filterCatalog", () => {
  it("searches by every term, case-insensitively", () => {
    expect(filterCatalog(items, parseShopQuery({ q: "CARGO" })).map((x) => x.slug)).toEqual(["cargo"]);
    expect(filterCatalog(items, parseShopQuery({ q: "brown jacket" }))).toHaveLength(0);
  });
  it("filters by category, type and stock", () => {
    expect(filterCatalog(items, parseShopQuery({ category: "outerwear" })).map((x) => x.slug)).toEqual(["jacket"]);
    expect(filterCatalog(items, parseShopQuery({ type: "merch" })).map((x) => x.slug)).toEqual(["sweat"]);
    expect(filterCatalog(items, parseShopQuery({ instock: "1" }))).toHaveLength(2);
  });
  it("sorts by price and keeps sold-out items last", () => {
    expect(filterCatalog(items, parseShopQuery({ sort: "price_desc" })).map((x) => x.slug)).toEqual(["cargo", "sweat", "jacket"]);
    expect(filterCatalog(items, parseShopQuery({ sort: "price_asc" })).map((x) => x.slug)).toEqual(["sweat", "cargo", "jacket"]);
  });
  it("ignores unknown values", () => {
    expect(parseShopQuery({ type: "x", sort: "y" })).toMatchObject({ type: undefined, sort: "newest" });
  });
});

describe("shopHref", () => {
  it("keeps other filters when one changes", () => {
    const q = parseShopQuery({ q: "cargo", type: "thrift" });
    expect(shopHref("id", q, { category: "pants" })).toBe("/id/shop?q=cargo&category=pants&type=thrift");
    expect(shopHref("en", q, { q: undefined, type: undefined })).toBe("/en/shop");
  });
});
