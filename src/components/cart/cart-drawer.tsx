"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { cart, useCart } from "./cart-store";
import { useI18n } from "@/components/i18n-provider";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { checkCart } from "@/lib/actions/cart";
import { formatPrice } from "@/lib/format";

export function CartDrawer() {
  const { locale, t } = useI18n();
  const { items, open, subtotal } = useCart();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Re-check stock every time the drawer opens.
  useEffect(() => {
    if (!open || items.length === 0) return;
    let cancelled = false;
    checkCart(items.map((i) => i.variantId)).then((live) => {
      if (cancelled) return;
      if (cart.reconcile(live) > 0) toast(t.cart.removedSoldOut, "error");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={t.cart.title}
      onClose={() => cart.close()}
      onClick={(e) => e.target === ref.current && cart.close()}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-md bg-surface p-0 text-fg backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-lg uppercase tracking-wide">{t.cart.title}</h2>
        <button
          onClick={() => cart.close()}
          className="grid size-10 place-items-center rounded-full hover:bg-surface-2"
          aria-label={t.nav.close}
        >
          <X className="size-5" />
        </button>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <ShoppingBag className="size-12 text-muted" aria-hidden />
          <p className="text-muted">{t.cart.empty}</p>
          <Link href={`/${locale}/shop`} onClick={() => cart.close()} className={buttonVariants()}>
            {t.cart.continue}
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-4 py-4">
                <Link
                  href={`/${locale}/p/${item.slug}`}
                  onClick={() => cart.close()}
                  className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2"
                >
                  <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-medium">{locale === "en" ? item.nameEn : item.nameId}</p>
                  <p className="text-sm text-muted">{item.size}</p>
                  <p className="mt-1 text-sm font-semibold">{formatPrice(item.price, locale)}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    {item.max > 1 ? (
                      <div className="flex items-center rounded-full border border-line" aria-label={t.cart.qty}>
                        <button
                          className="grid size-8 place-items-center disabled:opacity-40"
                          onClick={() => cart.setQty(item.variantId, item.qty - 1)}
                          disabled={item.qty <= 1}
                          aria-label="-1"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums">{item.qty}</span>
                        <button
                          className="grid size-8 place-items-center disabled:opacity-40"
                          onClick={() => cart.setQty(item.variantId, item.qty + 1)}
                          disabled={item.qty >= item.max}
                          aria-label="+1"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">1 pcs</span>
                    )}
                    <button
                      onClick={() => cart.remove(item.variantId)}
                      className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-danger"
                      aria-label={`${t.cart.remove} ${locale === "en" ? item.nameEn : item.nameId}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <footer className="space-y-3 border-t border-line px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-muted">{t.cart.subtotal}</span>
              <span className="text-lg font-bold">{formatPrice(subtotal, locale)}</span>
            </div>
            <p className="text-xs text-muted">{t.cart.shippingNote}</p>
            <Link
              href={`/${locale}/checkout`}
              onClick={() => cart.close()}
              className={buttonVariants({ size: "lg", className: "w-full" })}
            >
              {t.cart.checkout}
            </Link>
          </footer>
        </>
      )}
    </dialog>
  );
}
