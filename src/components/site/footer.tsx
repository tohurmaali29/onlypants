import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { cacheLife, cacheTag } from "next/cache";
import { getSettings, SETTINGS_TAG } from "@/lib/settings";
import { waLink } from "@/lib/format";
import { Logo } from "./header";

export async function Footer() {
  "use cache";
  cacheLife("days");
  cacheTag(SETTINGS_TAG);
  const [{ locale, t }, { store }] = await Promise.all([getDictionary(), getSettings()]);
  const p = (path: string) => `/${locale}${path}`;

  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo className="text-2xl" />
          <p className="max-w-xs text-sm text-muted">{t.footer.tagline}</p>
          <div className="flex gap-2 pt-2">
            {store.instagram && (
              <a
                href={`https://instagram.com/${store.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid size-10 place-items-center rounded-full border border-line hover:border-accent"
              >
                <InstagramIcon className="size-4" />
              </a>
            )}
            {store.whatsapp && (
              <a
                href={waLink(store.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="grid size-10 place-items-center rounded-full border border-line hover:border-accent"
              >
                <MessageCircle className="size-4" />
              </a>
            )}
            {store.email && (
              <a
                href={`mailto:${store.email}`}
                aria-label="Email"
                className="grid size-10 place-items-center rounded-full border border-line hover:border-accent"
              >
                <Mail className="size-4" />
              </a>
            )}
          </div>
        </div>

        <nav aria-label={t.footer.shop} className="space-y-2 text-sm">
          <h2 className="mb-3 font-semibold">{t.footer.shop}</h2>
          <Link href={p("/shop")} className="block text-muted hover:text-fg">{t.nav.shop}</Link>
          <Link href={p("/shop?category=pants")} className="block text-muted hover:text-fg">{t.nav.pants}</Link>
          <Link href={p("/shop?type=merch")} className="block text-muted hover:text-fg">{t.nav.merch}</Link>
          <Link href={p("/track")} className="block text-muted hover:text-fg">{t.nav.track}</Link>
        </nav>

        <nav aria-label={t.footer.help} className="space-y-2 text-sm">
          <h2 className="mb-3 font-semibold">{t.footer.help}</h2>
          <Link href={p("/help/how-to-buy")} className="block text-muted hover:text-fg">{t.footer.howToBuy}</Link>
          <Link href={p("/help/size-guide")} className="block text-muted hover:text-fg">{t.footer.sizeGuide}</Link>
          <Link href={p("/help/returns")} className="block text-muted hover:text-fg">{t.footer.returns}</Link>
          <Link href={p("/help/faq")} className="block text-muted hover:text-fg">{t.footer.faq}</Link>
        </nav>

        <div className="space-y-2 text-sm">
          <h2 className="mb-3 font-semibold">{t.nav.contact}</h2>
          {store.address && <p className="text-muted">{store.address}</p>}
          {store.hours && <p className="text-muted">{store.hours}</p>}
          <Link href={p("/contact")} className="inline-block pt-1 text-accent hover:underline">
            {t.nav.contact} →
          </Link>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} OnlyPants. {t.footer.rights}
          </p>
          <div className="flex gap-4">
            <Link href={p("/help/privacy")} className="hover:text-fg">{t.footer.privacy}</Link>
            <Link href={p("/help/terms")} className="hover:text-fg">{t.footer.terms}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
