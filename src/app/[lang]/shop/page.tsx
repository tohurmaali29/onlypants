import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/product/product-card";
import { SortSelect } from "@/components/product/sort-select";
import { getCatalog, getCategories, localized } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { fmt } from "@/lib/i18n/interpolate";
import { filterCatalog, parseShopQuery, shopHref, type ShopQuery } from "@/lib/shop-filter";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getDictionary();
  return { title: t.shop.title, alternates: { canonical: `/${locale}/shop` } };
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
        active ? "border-primary bg-primary text-white" : "border-line text-muted hover:border-accent hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/[lang]/shop">["searchParams"] }) {
  const query: ShopQuery = parseShopQuery(await searchParams);
  const [{ locale, t }, catalog, categories] = await Promise.all([getDictionary(), getCatalog(), getCategories()]);
  const items = filterCatalog(catalog, query);
  const href = (patch: Parameters<typeof shopHref>[2]) => shopHref(locale, query, patch);

  return (
    <>
      <div className="mb-2 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
        <Chip href={href({ category: undefined })} active={!query.category}>
          {t.shop.all}
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} href={href({ category: c.slug })} active={query.category === c.slug}>
            {localized.category(c, locale)}
          </Chip>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Chip href={href({ type: query.type === "thrift" ? undefined : "thrift" })} active={query.type === "thrift"}>
          {t.shop.thrift}
        </Chip>
        <Chip href={href({ type: query.type === "merch" ? undefined : "merch" })} active={query.type === "merch"}>
          {t.shop.merch}
        </Chip>
        <Chip href={href({ instock: query.instock ? undefined : "1" })} active={!!query.instock}>
          {t.shop.inStockOnly}
        </Chip>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted" aria-live="polite">
            {fmt(t.shop.results, { count: items.length })}
          </span>
          <SortSelect
            value={query.sort}
            label={t.shop.sort}
            options={[
              { value: "newest", label: t.shop.sortNewest },
              { value: "price_asc", label: t.shop.sortPriceAsc },
              { value: "price_desc", label: t.shop.sortPriceDesc },
            ]}
          />
        </div>
      </div>

      {query.q && <p className="mb-4 text-lg">{fmt(t.shop.searchFor, { q: query.q })}</p>}

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line py-20 text-center">
          <p className="text-muted">{t.shop.empty}</p>
          <Link href={`/${locale}/shop`} className="mt-3 inline-block text-accent hover:underline">
            {t.shop.reset}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} locale={locale} t={t} priority={i < 4} />
          ))}
        </div>
      )}
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-surface-2" />
          <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

export default async function ShopPage({ searchParams }: PageProps<"/[lang]/shop">) {
  const { t } = await getDictionary();
  return (
    <div className="container-page py-10">
      <h1 className="mb-6 font-display text-3xl uppercase sm:text-4xl">{t.shop.title}</h1>
      <Suspense fallback={<GridSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
