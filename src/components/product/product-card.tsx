import Image from "next/image";
import Link from "next/link";
import { localized, type CatalogProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fmt } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

export function discountPercent(p: Pick<CatalogProduct, "price" | "compareAtPrice">) {
  return p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
}

export function ProductCard({
  product: p,
  locale,
  t,
  priority = false,
}: {
  product: CatalogProduct;
  locale: Locale;
  t: Dictionary;
  priority?: boolean;
}) {
  const soldOut = p.available === 0;
  const name = localized.name(p, locale);
  const sizes = p.variants.map((v) => v.sizeLabel).join(" · ");

  return (
    <Link href={`/${locale}/p/${p.slug}`} className="group block" prefetch={false}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
        {p.images[0] && (
          <Image
            src={p.images[0].url}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-[1.04]",
              soldOut && "opacity-50 grayscale",
            )}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
          />
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {soldOut ? (
            <span className="rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
              {t.product.soldOut}
            </span>
          ) : p.type === "thrift" ? (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-bg">
              {t.product.onlyOne}
            </span>
          ) : null}
          {!soldOut && discountPercent(p) > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
              -{discountPercent(p)}%
            </span>
          )}
        </div>
        {p.conditionScore && (
          <span className="absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
            {p.conditionScore}/10
          </span>
        )}
      </div>
      <div className="mt-3 space-y-0.5">
        <h3 className="line-clamp-1 text-sm font-medium group-hover:text-accent">{name}</h3>
        <p className="text-xs text-muted">{sizes}</p>
        <p className="flex items-baseline gap-2 pt-0.5">
          <span className="font-semibold">{formatPrice(p.price, locale)}</span>
          {p.compareAtPrice && (
            <s className="text-xs text-muted" aria-label={fmt(t.product.save, { percent: discountPercent(p) })}>
              {formatPrice(p.compareAtPrice, locale)}
            </s>
          )}
        </p>
      </div>
    </Link>
  );
}
