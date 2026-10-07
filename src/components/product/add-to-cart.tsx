"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { cart, useCart } from "@/components/cart/cart-store";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { fmt } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

type Props = {
  product: { slug: string; nameId: string; nameEn: string; price: number; image: string };
  variants: { id: string; sizeLabel: string; available: number }[];
};

export function AddToCart({ product, variants }: Props) {
  const { t } = useI18n();
  const { items } = useCart();
  const single = variants.length === 1;
  const [selected, setSelected] = useState<string | null>(single ? variants[0].id : null);
  const variant = variants.find((v) => v.id === selected);
  const inCart = items.find((i) => i.variantId === selected)?.qty ?? 0;
  const allSoldOut = variants.every((v) => v.available === 0);
  const atLimit = !!variant && inCart >= variant.available;

  function add() {
    if (!variant) return;
    const ok = cart.add({
      variantId: variant.id,
      slug: product.slug,
      nameId: product.nameId,
      nameEn: product.nameEn,
      size: variant.sizeLabel,
      price: product.price,
      image: product.image,
      max: variant.available,
    });
    if (ok) {
      toast(t.product.added);
      cart.open();
    } else {
      toast(t.product.alreadyInCart, "error");
    }
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t.product.size}</legend>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const out = v.available === 0;
            return (
              <label
                key={v.id}
                className={cn(
                  "relative min-w-14 cursor-pointer rounded-xl border px-4 py-2.5 text-center text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                  selected === v.id ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:border-fg/50",
                  out && "cursor-not-allowed line-through opacity-40",
                )}
              >
                <input
                  type="radio"
                  name="size"
                  value={v.id}
                  disabled={out}
                  checked={selected === v.id}
                  onChange={() => setSelected(v.id)}
                  className="sr-only"
                />
                {v.sizeLabel}
              </label>
            );
          })}
        </div>
        {variant && variant.available > 1 && variant.available <= 3 && (
          <p className="mt-2 text-sm text-warning">{fmt(t.product.left, { count: variant.available })}</p>
        )}
      </fieldset>

      <Button
        size="lg"
        className="w-full"
        onClick={add}
        disabled={allSoldOut || !variant || atLimit}
        aria-describedby={!variant && !allSoldOut ? "size-hint" : undefined}
      >
        {allSoldOut ? (
          t.product.soldOut
        ) : atLimit ? (
          <>
            <Check className="size-5" /> {t.product.alreadyInCart}
          </>
        ) : (
          <>
            <ShoppingBag className="size-5" /> {t.product.addToCart}
          </>
        )}
      </Button>
      {!variant && !allSoldOut && (
        <p id="size-hint" className="-mt-3 text-center text-xs text-muted">
          {t.product.selectSize}
        </p>
      )}
    </div>
  );
}
