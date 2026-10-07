import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage() {
  const { t } = await getDictionary();
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-3xl uppercase sm:text-4xl">{t.checkout.title}</h1>
      <CheckoutForm />
    </div>
  );
}
