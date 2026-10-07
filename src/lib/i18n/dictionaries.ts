import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import id from "./dictionaries/id.json";
import en from "./dictionaries/en.json";

export type Dictionary = typeof id;
const dictionaries: Record<Locale, Dictionary> = { id, en };

/** Current locale from the `[lang]` root segment. Server Components only. */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!isLocale(value)) notFound();
  return value;
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}

export function dictionaryFor(locale: Locale) {
  return dictionaries[locale];
}
