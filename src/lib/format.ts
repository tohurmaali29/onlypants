import type { Locale } from "./i18n/config";

const rupiah = {
  id: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat("en-US", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }),
};

/** Rp 1.800.000 (id) / IDR 1,800,000 (en) */
export function formatPrice(amount: number, locale: Locale = "id") {
  return rupiah[locale].format(amount).replace(/ /g, " ");
}

export function formatDateTime(date: Date | string, locale: Locale = "id") {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

/** Normalize Indonesian phone numbers to 62xxxxxxxxxx. Returns null if invalid. */
export function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  return /^628\d{7,12}$/.test(digits) ? digits : null;
}

export function waLink(phone: string, text?: string) {
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${phone}${q}`;
}
