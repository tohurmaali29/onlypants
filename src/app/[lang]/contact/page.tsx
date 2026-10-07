import type { Metadata } from "next";
import { Clock, MapPin, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { waLink } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getDictionary();
  return { title: t.contact.title, alternates: { canonical: `/${locale}/contact` } };
}

export default async function ContactPage() {
  const [{ t }, { store }] = await Promise.all([getDictionary(), getSettings()]);
  return (
    <div className="container-page py-12">
      <h1 className="font-display text-3xl uppercase sm:text-4xl">{t.contact.title}</h1>
      <p className="mt-2 max-w-xl text-muted">{t.contact.body}</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ContactForm />
        <aside className="space-y-4">
          {store.whatsapp && (
            <a href={waLink(store.whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "whatsapp", size: "lg", className: "w-full" })}>
              <MessageCircle className="size-5" /> {t.home.waCta}
            </a>
          )}
          {store.instagram && (
            <a href={`https://instagram.com/${store.instagram}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}>
              <InstagramIcon className="size-5" /> @{store.instagram}
            </a>
          )}
          <div className="space-y-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 text-sm">
            {store.address && (
              <p className="flex gap-3">
                <MapPin className="size-4 shrink-0 text-accent" />
                <span>
                  <span className="block font-medium">{t.contact.address}</span>
                  <span className="text-muted">{store.address}</span>
                </span>
              </p>
            )}
            {store.hours && (
              <p className="flex gap-3">
                <Clock className="size-4 shrink-0 text-accent" />
                <span>
                  <span className="block font-medium">{t.contact.hours}</span>
                  <span className="text-muted">{store.hours}</span>
                </span>
              </p>
            )}
          </div>
          {store.address && (
            <iframe
              title="Map"
              src={`https://www.google.com/maps?q=${encodeURIComponent(store.address)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-[4/3] w-full rounded-[var(--radius-card)] border border-line"
            />
          )}
        </aside>
      </div>
    </div>
  );
}
