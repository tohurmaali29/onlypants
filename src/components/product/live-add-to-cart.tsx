import { connection } from "next/server";
import { AddToCart } from "./add-to-cart";
import { getLiveVariants, type CatalogProduct } from "@/lib/catalog";

type Props = {
  product: { slug: string; nameId: string; nameEn: string; price: number; image: string };
  variants: CatalogProduct["variants"];
};

/**
 * Size picker + add-to-cart with stock read at request time. The rest of the
 * product page comes from the cached catalog, but for one-of-one items the buy
 * button must never show a stale "sold out" or "available". Render in <Suspense>.
 */
export async function LiveAddToCart({ product, variants }: Props) {
  await connection();
  const live = await getLiveVariants(variants.map((v) => v.id));
  const fresh = variants.map((v) => {
    const l = live.find((x) => x.id === v.id);
    return { ...v, available: l ? Math.max(0, l.stockOnHand - l.reserved) : 0 };
  });
  return <AddToCart product={product} variants={fresh} />;
}

export function AddToCartSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="flex gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-11 w-16 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
      <div className="h-13 w-full animate-pulse rounded-full bg-surface-2" />
    </div>
  );
}
