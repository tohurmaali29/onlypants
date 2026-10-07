import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { HELP } from "@/lib/help-content";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return Object.keys(HELP).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/help/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getDictionary();
  const page = HELP[slug]?.[locale];
  return page ? { title: page.title, alternates: { canonical: `/${locale}/help/${slug}` } } : {};
}

export default async function HelpPage({ params }: PageProps<"/[lang]/help/[slug]">) {
  const { slug } = await params;
  const { locale } = await getDictionary();
  const page = HELP[slug]?.[locale];
  if (!page) notFound();

  return (
    <div className="container-page grid gap-10 py-12 md:grid-cols-[220px_1fr]">
      <nav aria-label="Help" className="flex gap-2 overflow-x-auto md:flex-col [scrollbar-width:none]">
        {Object.entries(HELP).map(([s, p]) => (
          <Link
            key={s}
            href={`/${locale}/help/${s}`}
            aria-current={s === slug ? "page" : undefined}
            className={cn("shrink-0 rounded-xl px-3 py-2 text-sm", s === slug ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}
          >
            {p[locale].title}
          </Link>
        ))}
      </nav>
      <article className="max-w-2xl">
        <h1 className="font-display text-3xl uppercase">{page.title}</h1>
        <div className="mt-8 space-y-8">
          {page.sections.map((sec, i) => (
            <section key={i}>
              {sec.h && <h2 className="mb-2 text-lg font-semibold">{sec.h}</h2>}
              {sec.p.map((para) => (
                <p key={para} className="mb-2 leading-relaxed text-fg/80">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
