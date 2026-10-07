"use client";

import { useSyncExternalStore } from "react";

export type CartItem = {
  variantId: string;
  slug: string;
  nameId: string;
  nameEn: string;
  size: string;
  price: number;
  image: string;
  qty: number;
  max: number; // available stock when last checked
};

type State = { items: CartItem[]; open: boolean; hydrated: boolean };

const KEY = "op_cart_v1";
let state: State = { items: [], open: false, hydrated: false };
const listeners = new Set<() => void>();

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  if (next.items) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.items));
    } catch {
      // storage full or blocked: the cart still works for this tab
    }
  }
  listeners.forEach((l) => l());
}

function hydrate() {
  if (state.hydrated || typeof window === "undefined") return;
  let items: CartItem[] = [];
  try {
    items = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(items)) items = [];
  } catch {
    items = [];
  }
  state = { ...state, items, hydrated: true };
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      try {
        emit({ items: JSON.parse(e.newValue ?? "[]") });
      } catch {}
    }
  });
}

const serverSnapshot: State = { items: [], open: false, hydrated: false };

export function useCart() {
  const snap = useSyncExternalStore(
    (l) => {
      hydrate();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (hydrate(), state),
    () => serverSnapshot,
  );
  return {
    ...snap,
    count: snap.items.reduce((n, i) => n + i.qty, 0),
    subtotal: snap.items.reduce((n, i) => n + i.qty * i.price, 0),
  };
}

export const cart = {
  /** Returns false when the variant is already at its stock limit. */
  add(item: Omit<CartItem, "qty">, qty = 1) {
    const existing = state.items.find((i) => i.variantId === item.variantId);
    if (existing) {
      if (existing.qty >= item.max) return false;
      emit({
        items: state.items.map((i) =>
          i.variantId === item.variantId ? { ...i, ...item, qty: Math.min(i.qty + qty, item.max) } : i,
        ),
      });
    } else {
      emit({ items: [...state.items, { ...item, qty: Math.min(qty, item.max) }] });
    }
    return true;
  },
  setQty(variantId: string, qty: number) {
    emit({
      items: state.items
        .map((i) => (i.variantId === variantId ? { ...i, qty: Math.max(0, Math.min(qty, i.max)) } : i))
        .filter((i) => i.qty > 0),
    });
  },
  remove(variantId: string) {
    emit({ items: state.items.filter((i) => i.variantId !== variantId) });
  },
  /** Apply live stock from the server. Returns how many lines were reduced or removed. */
  reconcile(live: { variantId: string; available: number; price: number }[]) {
    let changed = 0;
    const items = state.items
      .map((i) => {
        const l = live.find((x) => x.variantId === i.variantId);
        const available = l?.available ?? 0;
        const qty = Math.min(i.qty, available);
        if (qty !== i.qty) changed++;
        return { ...i, qty, max: available, price: l?.price ?? i.price };
      })
      .filter((i) => i.qty > 0);
    emit({ items });
    return changed;
  },
  clear() {
    emit({ items: [] });
  },
  open() {
    emit({ open: true });
  },
  close() {
    emit({ open: false });
  },
};
