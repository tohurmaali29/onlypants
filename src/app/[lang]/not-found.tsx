import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function NotFound() {
  const { locale, t } = await getDictionary();
  return (
    <div className="container-page flex min-h-[60svh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-7xl text-primary-hover">404</p>
      <h1 className="mt-4 font-display text-2xl uppercase">{t.common.notFound}</h1>
      <p className="mt-2 max-w-sm text-muted">{t.common.notFoundBody}</p>
      <div className="mt-8 flex gap-3">
        <Link href={`/${locale}/shop`} className={buttonVariants()}>
          {t.nav.shop}
        </Link>
        <Link href={`/${locale}`} className={buttonVariants({ variant: "secondary" })}>
          {t.common.home}
        </Link>
      </div>
    </div>
  );
}
