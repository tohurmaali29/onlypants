import Link from "next/link";
import { LayoutDashboard, UserRound } from "lucide-react";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getViewer } from "@/lib/viewer";

/** Header account entry. Reads the session, so render it inside <Suspense> (fallback: AccountButtonFallback). */
export async function AccountButton({ variant = "icon" }: { variant?: "icon" | "menu" }) {
  const [{ locale, t }, viewer] = await Promise.all([getDictionary(), getViewer()]);
  const staff = viewer?.staff?.active;
  const href = !viewer ? `/${locale}/login` : staff ? "/admin" : `/${locale}/account`;
  const label = !viewer ? t.auth.signIn : staff ? t.auth.dashboard : t.auth.myAccount;
  const initial = (viewer?.customer?.name ?? viewer?.staff?.name ?? viewer?.email ?? "?").trim().charAt(0).toUpperCase();

  if (variant === "menu") {
    return (
      <Link href={href} className="flex items-center gap-3 py-3 text-lg">
        {staff ? <LayoutDashboard className="size-5" /> : <UserRound className="size-5" />} {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center rounded-full hover:bg-surface-2"
    >
      {viewer ? (
        <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-white">
          {staff ? <LayoutDashboard className="size-3.5" /> : initial}
        </span>
      ) : (
        <UserRound className="size-5" />
      )}
    </Link>
  );
}

export async function AccountButtonFallback({ variant = "icon" }: { variant?: "icon" | "menu" }) {
  const { locale, t } = await getDictionary();
  return variant === "menu" ? (
    <Link href={`/${locale}/login`} className="flex items-center gap-3 py-3 text-lg">
      <UserRound className="size-5" /> {t.auth.account}
    </Link>
  ) : (
    <Link href={`/${locale}/login`} aria-label={t.auth.account} className="grid size-10 place-items-center rounded-full hover:bg-surface-2">
      <UserRound className="size-5" />
    </Link>
  );
}
