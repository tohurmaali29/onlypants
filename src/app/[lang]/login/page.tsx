import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForms } from "@/components/account/forms";
import { buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/account";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { fmt } from "@/lib/i18n/interpolate";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.auth.signIn, robots: { index: false } };
}

async function Content({ searchParams }: Pick<PageProps<"/[lang]/login">, "searchParams">) {
  const [{ locale, t }, sp, viewer] = await Promise.all([getDictionary(), searchParams, getViewer()]);
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : undefined;
  const wantsAdmin = next?.startsWith("/admin");

  if (viewer) {
    if (viewer.staff?.active) redirect(wantsAdmin ? next! : "/admin");
    if (!wantsAdmin) redirect(next ?? `/${locale}/account`);
    // Signed in as a customer but trying to reach the dashboard.
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">{fmt(t.auth.signedInAsCustomer, { email: viewer.email })}</p>
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button className={buttonVariants({ variant: "secondary" })}>{t.auth.signOut}</button>
        </form>
      </div>
    );
  }

  return (
    <>
      {sp.error === "link" && (
        <p role="alert" className="mb-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {t.auth.errors.link}
        </p>
      )}
      <AuthForms next={next} initialTab={sp.tab === "signup" ? "signup" : "signin"} />
      {!wantsAdmin && (
        <p className="mt-6 text-center text-sm text-muted">
          <Link href={`/${locale}/shop`} className="hover:text-fg">
            ← {t.cart.continue}
          </Link>
        </p>
      )}
    </>
  );
}

export default async function LoginPage({ searchParams }: PageProps<"/[lang]/login">) {
  const { t } = await getDictionary();
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-8">
        <h1 className="font-display text-2xl uppercase">{t.auth.signInTitle}</h1>
        <p className="mt-1 mb-6 text-sm text-muted">{t.auth.signInBody}</p>
        <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-surface-2" />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
