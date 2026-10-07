"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Lock } from "lucide-react";
import { cart, useCart } from "@/components/cart/cart-store";
import { useI18n } from "@/components/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { checkCart } from "@/lib/actions/cart";
import { checkout } from "@/lib/actions/checkout";
import { formatPrice } from "@/lib/format";
import { fmt } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

const FIELDS = ["customerName", "email", "phone", "line", "district", "city", "province", "postalCode", "note"] as const;
type Field = (typeof FIELDS)[number];
const SAVED = "op_checkout_contact";

function Input({
  name,
  label,
  error,
  hint,
  className,
  ...props
}: React.ComponentProps<"input"> & { name: Field; label: string; error?: string; hint?: string }) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className="input-field"
        {...props}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function CheckoutForm() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { items, subtotal, hydrated } = useCart();
  const [errors, setErrors] = useState<Partial<Record<Field | "terms", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Partial<Record<Field, string>>>({});
  const [pending, startTransition] = useTransition();
  const e = t.checkout.errors;

  // Restore the contact details from the last order on this device.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);

  // Refresh stock once on arrival.
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    checkCart(items.map((i) => i.variantId)).then((live) => {
      if (cart.reconcile(live) > 0) toast(t.cart.removedSoldOut, "error");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface" aria-busy />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line py-20 text-center">
        <p className="text-muted">{t.cart.empty}</p>
        <Link href={`/${locale}/shop`} className={buttonVariants({ className: "mt-4" })}>
          {t.cart.continue}
        </Link>
      </div>
    );
  }

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const values = Object.fromEntries(FIELDS.map((f) => [f, String(fd.get(f) ?? "")])) as Record<Field, string>;
    setFormError(null);
    setErrors({});

    startTransition(async () => {
      const res = await checkout({
        ...values,
        locale,
        terms: fd.get("terms") === "on",
        website: String(fd.get("website") ?? ""),
        items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
      } as Parameters<typeof checkout>[0]);

      if (res.ok) {
        try {
          localStorage.setItem(SAVED, JSON.stringify({ ...values, note: undefined }));
        } catch {}
        cart.clear();
        router.push(res.url);
        return;
      }
      if (res.error === "validation") {
        const msg: Partial<Record<Field | "terms", string>> = {};
        for (const f of res.fields) {
          msg[f as Field] =
            f === "email" ? e.email : f === "phone" ? e.phone : f === "postalCode" ? e.postalCode : f === "terms" ? e.terms : e.required;
        }
        setErrors(msg);
        const first = res.fields.find((f) => f !== "items");
        document.getElementById(`f-${first}`)?.focus();
      } else if (res.error === "stock") {
        setFormError(fmt(e.stock, { items: res.items.join(", ") }));
        const live = await checkCart(items.map((i) => i.variantId));
        cart.reconcile(live);
      } else {
        setFormError(e[res.error]);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-10">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-4 font-display text-lg uppercase">{t.checkout.contact}</legend>
          <Input name="customerName" label={t.checkout.name} autoComplete="name" required defaultValue={saved.customerName} error={errors.customerName} className="sm:col-span-2" />
          <Input name="email" type="email" label={t.checkout.email} autoComplete="email" required defaultValue={saved.email} error={errors.email} />
          <Input name="phone" type="tel" inputMode="tel" label={t.checkout.phone} autoComplete="tel" required defaultValue={saved.phone} hint={t.checkout.phoneHint} error={errors.phone} />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-4 font-display text-lg uppercase">{t.checkout.shipping}</legend>
          <Input name="line" label={t.checkout.address} autoComplete="street-address" required defaultValue={saved.line} error={errors.line} className="sm:col-span-2" />
          <Input name="district" label={t.checkout.district} required defaultValue={saved.district} error={errors.district} />
          <Input name="city" label={t.checkout.city} autoComplete="address-level2" required defaultValue={saved.city} error={errors.city} />
          <Input name="province" label={t.checkout.province} autoComplete="address-level1" required defaultValue={saved.province} error={errors.province} />
          <Input name="postalCode" label={t.checkout.postalCode} autoComplete="postal-code" inputMode="numeric" maxLength={5} required defaultValue={saved.postalCode} error={errors.postalCode} />
          <div className="sm:col-span-2">
            <label htmlFor="f-note" className="mb-1.5 block text-sm font-medium">
              {t.checkout.note}
            </label>
            <textarea id="f-note" name="note" rows={2} maxLength={500} className="input-field" />
          </div>
        </fieldset>

        {/* Honeypot: hidden from people, filled by bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">{t.checkout.howItWorks}</h2>
          <ol className="space-y-2 text-sm text-muted">
            {[t.checkout.step1, t.checkout.step2, t.checkout.step3].map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="mb-4 font-display text-lg uppercase">{t.checkout.summary}</h2>
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.variantId} className="flex gap-3 py-3">
                <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{locale === "en" ? i.nameEn : i.nameId}</p>
                  <p className="text-muted">
                    {i.size} × {i.qty}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatPrice(i.price * i.qty, locale)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t.cart.subtotal}</dt>
              <dd className="font-semibold">{formatPrice(subtotal, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t.checkout.shippingCost}</dt>
              <dd className="text-muted italic">{t.checkout.shippingTbd}</dd>
            </div>
          </dl>

          <label className={cn("mt-5 flex items-start gap-3 text-sm", errors.terms && "text-danger")}>
            <input type="checkbox" name="terms" required className="mt-0.5 size-4 accent-[var(--color-primary)]" />
            <span>
              {t.checkout.terms}{" "}
              <Link href={`/${locale}/help/terms`} target="_blank" className="text-accent underline">
                ↗
              </Link>
            </span>
          </label>

          {formError && (
            <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              {formError}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-5 animate-spin" /> {t.checkout.submitting}
              </>
            ) : (
              <>
                <Lock className="size-4" /> {t.checkout.submit}
              </>
            )}
          </Button>
        </div>
      </aside>
    </form>
  );
}
