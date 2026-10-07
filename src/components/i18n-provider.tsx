"use client";

import { createContext, use } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

const I18nContext = createContext<{ locale: Locale; t: Dictionary } | null>(null);

export function I18nProvider({
  locale,
  t,
  children,
}: {
  locale: Locale;
  t: Dictionary;
  children: React.ReactNode;
}) {
  return <I18nContext value={{ locale, t }}>{children}</I18nContext>;
}

export function useI18n() {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
