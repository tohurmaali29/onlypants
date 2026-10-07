import type { Metadata, Viewport } from "next";
import { Archivo_Black, Poppins } from "next/font/google";
import { lang } from "next/root-params";
import { Analytics } from "@vercel/analytics/next";
import "../globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Toaster } from "@/components/ui/toast";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { locales } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
const archivo = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((l) => ({ lang: l }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getDictionary();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t.meta.title, template: "%s — OnlyPants" },
    description: t.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: { id: "/id", en: "/en", "x-default": "/id" },
    },
    openGraph: {
      type: "website",
      siteName: "OnlyPants",
      locale: locale === "id" ? "id_ID" : "en_US",
      images: [{ url: "/images/brand/lifestyle.jpg", width: 1200, height: 630 }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  colorScheme: "dark",
};

export default async function StoreLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale, t } = await getDictionary();
  return (
    <html lang={await lang()} className={`${poppins.variable} ${archivo.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <I18nProvider locale={locale} t={t}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2"
          >
            Skip to content
          </a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <CartDrawer />
          <Toaster />
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
