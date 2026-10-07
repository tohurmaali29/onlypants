import type { Metadata } from "next";
import { ForgotForm } from "@/components/account/forms";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.auth.forgotTitle, robots: { index: false } };
}

export default async function ForgotPage() {
  const { t } = await getDictionary();
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-8">
        <h1 className="font-display text-2xl uppercase">{t.auth.forgotTitle}</h1>
        <p className="mt-1 mb-6 text-sm text-muted">{t.auth.forgotBody}</p>
        <ForgotForm />
      </div>
    </div>
  );
}
