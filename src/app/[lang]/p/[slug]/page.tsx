import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { AddToCart } from "@/components/product/add-to-cart";
import { BackLink } from "@/components/site/nav-history";
import { ProductCard, discountPercent } from "@/components/product/product-card";
import { getCatalog, getProduct, localized } from "@/lib/catalog";
import { formatPrice, waLink } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { fmt } from "@/lib/i18n/interpolate";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/site";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [{ locale }, product] = await Promise.all([getDictionary(), getProduct(slug)]);
  if (!product) return {};
  const name = localized.name(product, locale);
  return {
    title: name,
    description: localized.description(product, locale).slice(0, 160),
    alternates: {
      canonical: `/${locale}/p/${slug}`,
      languages: { id: `/id/p/${slug}`, en: `/en/p/${slug}` },
    },
    openGraph: { title: name, images: product.images.map((i) => ({ url: i.url })) },
  };
}

async function ProductDetails({ params }: Pick<PageProps<"/[lang]/p/[slug]">, "params">) {
  const { slug } = await params;
  const [{ locale, t }, product, catalog, { store }] = await Promise.all([
    getDictionary(),
    getProduct(slug),
    getCatalog(),
    getSettings(),
  ]);
  if (!product) notFound();

  const name = localized.name(product, locale);
  const description = localized.description(product, locale);
  const conditionNote = localized.conditionNote(product, locale);
  const measurements = Object.entries(product.measurements).filter(([, v]) => typeof v === "number");
  const related = catalog
    .filter((p) => p.id !== product.id && p.available > 0)
    .sort((a, b) => Number(b.category.slug === product.category.slug) - Number(a.category.slug === product.category.slug))
    .slice(0, 4);
  const mLabel = (key: string) => (t.product.m as Record<string, string>)[key] ?? key;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: product.images.map((i) => new URL(i.url, siteUrl).toString()),
    sku: product.slug,
    itemCondition: product.type === "thrift" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: product.price,
      availability: product.available > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: `${siteUrl}/${locale}/p/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
        <div className="space-y-3">
          {product.images.map((img, i) => (
            <div key={img.url} className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
              <Image
                src={img.url}
                alt={i === 0 ? name : `${name} ${i + 1}`}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                preload={i === 0}
              />
            </div>
          ))}
        </div>

        <div className="md:sticky md:top-24 md:self-start">
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            {localized.category(product.category, locale)} · {product.type === "thrift" ? t.product.onlyOne : "Merch"}
          </p>
          <h1 className="mt-2 font-display text-3xl uppercase sm:text-4xl">{name}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-2xl font-bold">{formatPrice(product.price, locale)}</span>
            {product.compareAtPrice && (
              <>
                <s className="text-muted">{formatPrice(product.compareAtPrice, locale)}</s>
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold">
                  {fmt(t.product.save, { percent: discountPercent(product) })}
                </span>
              </>
            )}
          </div>

          <div className="mt-8">
            <AddToCart
              product={{
                slug: product.slug,
                nameId: product.nameId,
                nameEn: product.nameEn,
                price: product.price,
                image: product.images[0]?.url ?? "",
              }}
              variants={product.variants}
            />
          </div>

          {store.whatsapp && (
            <a
              href={waLink(store.whatsapp, `Halo OnlyPants, saya mau tanya soal ${name} (${siteUrl}/${locale}/p/${product.slug})`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-sm text-muted hover:text-fg"
            >
              <MessageCircle className="size-4" /> {t.product.askWa}
            </a>
          )}

          <div className="mt-8 divide-y divide-line border-y border-line">
            {product.conditionScore && (
              <section className="py-5">
                <h2 className="flex items-center justify-between text-sm font-semibold">
                  {t.product.condition}
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs">{product.conditionScore}/10</span>
                </h2>
                {conditionNote && <p className="mt-2 text-sm text-muted">{conditionNote}</p>}
              </section>
            )}
            {measurements.length > 0 && (
              <section className="py-5">
                <h2 className="text-sm font-semibold">{t.product.measurements}</h2>
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {measurements.map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-line/60 pb-1.5">
                      <dt className="text-muted">{mLabel(k)}</dt>
                      <dd className="font-medium tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-muted">{t.product.measurementNote}</p>
              </section>
            )}
            {description && (
              <section className="py-5">
                <h2 className="text-sm font-semibold">{t.product.description}</h2>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-fg/80">{description}</p>
              </section>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <h2 id="related" className="mb-6 font-display text-2xl uppercase">
            {t.product.related}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} locale={locale} t={t} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2" aria-hidden>
      <div className="aspect-[4/5] animate-pulse rounded-[var(--radius-card)] bg-surface-2" />
      <div className="space-y-4">
        <div className="h-4 w-1/3 animate-pulse rounded bg-surface-2" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-surface-2" />
        <div className="h-8 w-1/4 animate-pulse rounded bg-surface-2" />
        <div className="h-12 w-full animate-pulse rounded-full bg-surface-2" />
      </div>
    </div>
  );
}

export default async function ProductPage({ params }: PageProps<"/[lang]/p/[slug]">) {
  const { locale, t } = await getDictionary();
  return (
    <div className="container-page py-6 md:py-10">
      <BackLink href={`/${locale}/shop`} className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> {t.nav.shop}
      </BackLink>
      <Suspense fallback={<DetailSkeleton />}>
        <ProductDetails params={params} />
      </Suspense>
    </div>
  );
}
