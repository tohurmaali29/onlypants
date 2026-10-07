"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { sendContact } from "@/lib/actions/contact";

export function ContactForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(sendContact, null);

  if (state?.ok) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-[var(--radius-card)] border border-success/40 bg-success/10 p-5">
        <CheckCircle2 className="size-5 text-success" /> {t.contact.sent}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium">{t.contact.name}</label>
          <input id="c-name" name="name" required minLength={2} autoComplete="name" className="input-field" />
        </div>
        <div>
          <label htmlFor="c-email" className="mb-1.5 block text-sm font-medium">{t.contact.email}</label>
          <input id="c-email" name="email" type="email" required autoComplete="email" className="input-field" />
        </div>
      </div>
      <div>
        <label htmlFor="c-phone" className="mb-1.5 block text-sm font-medium">{t.contact.phone}</label>
        <input id="c-phone" name="phone" type="tel" autoComplete="tel" className="input-field" />
      </div>
      <div>
        <label htmlFor="c-msg" className="mb-1.5 block text-sm font-medium">{t.contact.message}</label>
        <textarea id="c-msg" name="message" required minLength={5} rows={5} className="input-field" />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state && !state.ok && (
        <p role="alert" className="text-sm text-danger">
          {state.error === "rateLimit" ? t.checkout.errors.rateLimit : t.checkout.errors.generic}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />} {t.contact.submit}
      </Button>
    </form>
  );
}
