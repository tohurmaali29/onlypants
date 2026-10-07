import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, MessageCircle, QrCode, Ruler } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { buttonVariants } from "@/components/ui/button";
import { getCatalog, getCategories, localized } from "@/lib/catalog";
import { waLink } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const [{ locale, t }, catalog, categories, { store }] = await Promise.all([
    getDictionary(),
    getCatalog(),
    getCategories(),
    getSettings(),
  ]);

  const drops = [...catalog].sort((a, b) => Number(b.available > 0) - Number(a.available > 0)).slice(0, 8);
  const categoryCover = (slug: string) => catalog.find((p) => p.category.slug === slug)?.images[0]?.url;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/brand/lifestyle.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          className="-z-20 object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg via-bg/85 to-bg/30" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-bg to-transparent" />
        <div className="container-page grid min-h-[78svh] items-center gap-10 py-16 md:grid-cols-[1.2fr_1fr]">
          <div className="max-w-xl">
            <p className="mb-4 text-xs font-semibold tracking-[0.25em] text-accent uppercase">{t.home.heroEyebrow}</p>
            <h1 className="font-display text-4xl leading-[1.05] uppercase sm:text-6xl">{t.home.heroTitle}</h1>
            <p className="mt-5 max-w-md text-base text-fg/80 sm:text-lg">{t.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/shop`} className={buttonVariants({ size: "lg" })}>
                {t.home.heroCta} <ArrowRight className="size-4" />
              </Link>
              <Link href={`/${locale}/shop?type=merch`} className={buttonVariants({ variant: "secondary", size: "lg" })}>
                {t.home.heroSecondary}
              </Link>
            </div>
          </div>
          <div className="relative mx-auto hidden aspect-square w-full max-w-sm rotate-3 overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-primary/30 md:block">
            {/* Source is a 16:9 canvas with the mascot centered; crop to the character. */}
            <Image
              src="/images/brand/mascot.jpg"
              alt="OnlyPants mascot"
              fill
              className="scale-[1.6] object-cover"
              sizes="384px"
            />
          </div>
        </div>
      </section>

      {/* New drops */}
      <section className="container-page py-14" aria-labelledby="drops">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="drops" className="font-display text-2xl uppercase sm:text-3xl">
            {t.home.newDrops}
          </h2>
          <Link href={`/${locale}/shop`} className="flex items-center gap-1 text-sm text-accent hover:underline">
            {t.home.viewAll} <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {drops.map((p, i) => (
            <ProductCard key={p.id} product={p} locale={locale} t={t} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-10" aria-labelledby="cats">
        <h2 id="cats" className="mb-6 font-display text-2xl uppercase sm:text-3xl">
          {t.home.categories}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((c) => {
            const cover = categoryCover(c.slug);
            return (
              <Link
                key={c.id}
                href={`/${locale}/shop?category=${c.slug}`}
                className="group relative flex aspect-square items-end overflow-hidden rounded-[var(--radius-card)] bg-surface-2 p-4"
              >
                {cover && (
                  <Image
                    src={cover}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 25vw, 50vw"
                    className="object-cover opacity-60 transition duration-500 group-hover:scale-105 group-hover:opacity-80"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="relative font-display text-lg uppercase">{localized.category(c, locale)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Why */}
      <section className="container-page py-14" aria-labelledby="why">
        <h2 id="why" className="sr-only">
          {t.home.whyTitle}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: BadgeCheck, title: t.home.why1Title, body: t.home.why1Body },
            { icon: Ruler, title: t.home.why2Title, body: t.home.why2Body },
            { icon: QrCode, title: t.home.why3Title, body: t.home.why3Body },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <Icon className="size-6 text-accent" aria-hidden />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="container-page py-14" aria-labelledby="about-title">
        <div className="grid items-center gap-8 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-auto md:h-full md:min-h-80">
            <Image src="/images/brand/store.webp" alt="OnlyPants store" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="p-6 md:p-10">
            <h2 id="about-title" className="font-display text-2xl uppercase sm:text-3xl">
              {t.home.aboutTitle}
            </h2>
            <p className="mt-4 leading-relaxed text-fg/80">{t.home.aboutBody}</p>
          </div>
        </div>
      </section>

      {/* WhatsApp CTA */}
      {store.whatsapp && (
        <section className="container-page py-6">
          <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] bg-primary p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
            <div>
              <h2 className="text-xl font-bold">{t.home.waTitle}</h2>
              <p className="mt-1 text-white/80">{t.home.waBody}</p>
            </div>
            <a
              href={waLink(store.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "whatsapp", size: "lg" })}
            >
              <MessageCircle className="size-5" /> {t.home.waCta}
            </a>
          </div>
        </section>
      )}
    </>
  );
}
