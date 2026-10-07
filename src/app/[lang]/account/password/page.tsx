import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PasswordForm } from "@/components/account/forms";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.auth.newPasswordTitle, robots: { index: false } };
}

async function Guarded() {
  const [{ locale }, viewer] = await Promise.all([getDictionary(), getViewer()]);
  if (!viewer) redirect(`/${locale}/login?next=/${locale}/account/password`);
  return <PasswordForm />;
}

export default async function NewPasswordPage() {
  const { t } = await getDictionary();
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-8">
        <h1 className="mb-6 font-display text-2xl uppercase">{t.auth.newPasswordTitle}</h1>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface-2" />}>
          <Guarded />
        </Suspense>
      </div>
    </div>
  );
}
