"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { cart, useCart } from "@/components/cart/cart-store";
import { useI18n } from "@/components/i18n-provider";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-xl tracking-tight", className)}>
      <span className="text-accent">Only</span>
      <span className="text-primary-hover italic">Pants</span>
    </span>
  );
}

function rememberLocale(to: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${to}; path=/; max-age=31536000; samesite=lax`;
}

/** Reads the pathname, so it must sit inside <Suspense> (routes with unknown params can't prerender it). */
function LanguageSwitchLinks() {
  const pathname = usePathname();
  return <LanguageSwitchView swap={(to) => pathname.replace(/^\/(id|en)(?=\/|$)/, `/${to}`)} />;
}

function LanguageSwitchView({ swap }: { swap: (to: Locale) => string }) {
  const { locale } = useI18n();
  return (
    <div className="flex items-center rounded-full border border-line p-0.5 text-xs font-semibold">
      {(["id", "en"] as const).map((l) => (
        <Link
          key={l}
          href={swap(l)}
          onClick={() => rememberLocale(l)}
          aria-current={l === locale ? "true" : undefined}
          hrefLang={l}
          className={cn(
            "rounded-full px-2.5 py-1 uppercase",
            l === locale ? "bg-primary text-white" : "text-muted hover:text-fg",
          )}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}

function LanguageSwitch() {
  return (
    <Suspense fallback={<LanguageSwitchView swap={(to) => `/${to}`} />}>
      <LanguageSwitchLinks />
    </Suspense>
  );
}

export function Header() {
  const { locale, t } = useI18n();
  const { count, hydrated } = useCart();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const closeAll = () => {
    setMenuOpen(false);
    setSearchOpen(false);
  };

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setMenuOpen(false), setSearchOpen(false));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const links = [
    { href: `/${locale}/shop`, label: t.nav.shop },
    { href: `/${locale}/shop?category=pants`, label: t.nav.pants },
    { href: `/${locale}/shop?type=merch`, label: t.nav.merch },
    { href: `/${locale}/track`, label: t.nav.track },
    { href: `/${locale}/contact`, label: t.nav.contact },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line/70 bg-bg/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center gap-4">
          <button
            className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-surface-2 md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label={t.nav.menu}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <Menu className="size-5" />
          </button>

          <Link href={`/${locale}`} onClick={closeAll} aria-label="OnlyPants home">
            <Logo />
          </Link>

          <nav className="ml-6 hidden items-center gap-6 text-sm md:flex" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={closeAll} className="text-muted transition-colors hover:text-fg">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              className="grid size-10 place-items-center rounded-full hover:bg-surface-2"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={t.nav.search}
              aria-expanded={searchOpen}
            >
              <Search className="size-5" />
            </button>
            <div className="hidden sm:block">
              <LanguageSwitch />
            </div>
            <button
              className="relative grid size-10 place-items-center rounded-full hover:bg-surface-2"
              onClick={() => cart.open()}
              aria-label={`${t.nav.cart}${hydrated && count ? ` (${count})` : ""}`}
            >
              <ShoppingBag className="size-5" />
              {hydrated && count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-white">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {searchOpen && (
          <form
            role="search"
            className="container-page pb-3"
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchRef.current?.value.trim();
              setSearchOpen(false);
              router.push(`/${locale}/shop${q ? `?q=${encodeURIComponent(q)}` : ""}`);
            }}
          >
            <label className="relative block">
              <span className="sr-only">{t.nav.search}</span>
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input ref={searchRef} type="search" name="q" placeholder={t.nav.searchPlaceholder} className="input-field pl-10" />
            </label>
          </form>
        )}
      </header>

      {/* Mobile menu. Must live outside <header>: its backdrop-filter would make the
          header the containing block for `fixed`, clipping the panel to 64px. */}
      <div
        id="mobile-menu"
        className={cn("fixed inset-0 z-[60] md:hidden", menuOpen ? "visible" : "invisible")}
        aria-hidden={!menuOpen}
      >
        <div
          className={cn("absolute inset-0 bg-black/60 transition-opacity", menuOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMenuOpen(false)}
        />
        <nav
          aria-label="Mobile"
          className={cn(
            "absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-surface p-5 transition-transform",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <Logo />
            <button
              className="grid size-10 place-items-center rounded-full hover:bg-surface-2"
              onClick={() => setMenuOpen(false)}
              aria-label={t.nav.close}
              tabIndex={menuOpen ? 0 : -1}
            >
              <X className="size-5" />
            </button>
          </div>
          <Link href={`/${locale}`} onClick={closeAll} className="py-3 text-lg" tabIndex={menuOpen ? 0 : -1}>
            {t.nav.home}
          </Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={closeAll} className="py-3 text-lg" tabIndex={menuOpen ? 0 : -1}>
              {l.label}
            </Link>
          ))}
          <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm text-muted">{t.nav.language}</span>
            <LanguageSwitch />
          </div>
        </nav>
      </div>
    </>
  );
}
