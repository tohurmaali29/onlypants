import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KeyRound, LayoutDashboard, LogOut } from "lucide-react";
import { AddressManager, ProfileForm } from "@/components/account/forms";
import { buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/account";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { fmt } from "@/lib/i18n/interpolate";
import { orderAccessKey } from "@/lib/orders/codes";
import { getAddresses, getCustomerOrders, getViewer } from "@/lib/viewer";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.account.title, robots: { index: false } };
}

const card = "rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6";

async function AccountContent() {
  const [{ locale, t }, viewer] = await Promise.all([getDictionary(), getViewer()]);
  if (!viewer) redirect(`/${locale}/login?next=/${locale}/account`);
  const [addresses, orders] = await Promise.all([getAddresses(viewer.userId), getCustomerOrders(viewer.userId)]);
  const name = viewer.customer?.name ?? viewer.staff?.name ?? viewer.email;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase">{fmt(t.account.hello, { name: name.split(" ")[0] })}</h1>
          <p className="text-sm text-muted">{viewer.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewer.staff?.active && (
            <Link href="/admin" className={buttonVariants({ size: "sm" })}>
              <LayoutDashboard className="size-4" /> {t.auth.dashboard}
            </Link>
          )}
          <Link href={`/${locale}/account/password`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <KeyRound className="size-4" /> {t.account.changePassword}
          </Link>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <LogOut className="size-4" /> {t.auth.signOut}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className={card} aria-labelledby="orders">
            <h2 id="orders" className="mb-4 font-semibold">
              {t.account.orders}
            </h2>
            {orders.length === 0 ? (
              <p className="text-sm text-muted">{t.account.noOrders}</p>
            ) : (
              <ul className="divide-y divide-line">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/${locale}/order/${o.code}?k=${orderAccessKey(o.code)}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm hover:text-accent"
                    >
                      <span>
                        <span className="font-semibold">{o.code}</span>
                        <span className="block text-xs text-muted">{formatDateTime(o.createdAt, locale)}</span>
                      </span>
                      <span className="text-right">
                        <span className="block">{t.order.statuses[o.status]}</span>
                        <span className="text-xs text-muted">{formatPrice(o.total ?? o.subtotal, locale)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card} aria-labelledby="addresses">
            <h2 id="addresses" className="mb-4 font-semibold">
              {t.account.addresses}
            </h2>
            <AddressManager
              addresses={addresses.map((a) => ({
                id: a.id,
                label: a.label,
                recipient: a.recipient,
                phone: a.phone,
                line: a.line,
                district: a.district,
                city: a.city,
                province: a.province,
                postalCode: a.postalCode,
                isDefault: a.isDefault,
              }))}
            />
          </section>
        </div>

        <section className={`${card} lg:self-start`} aria-labelledby="profile">
          <h2 id="profile" className="mb-4 font-semibold">
            {t.account.profile}
          </h2>
          <ProfileForm name={name} phone={viewer.customer?.phone ?? ""} email={viewer.email} />
        </section>
      </div>
    </>
  );
}

export default function AccountPage() {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface" />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}
