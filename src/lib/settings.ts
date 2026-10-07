import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/lib/db";

export const SETTINGS_TAG = "settings";

export type StoreSettings = {
  name: string;
  whatsapp: string;
  email: string;
  instagram: string;
  address: string;
  hours: string;
};
export type PaymentSettings = { qris_image_url: string; merchant_name: string; is_dummy: boolean };
export type TimeoutSettings = { quote_hours: number; payment_hours: number };

export type Settings = { store: StoreSettings; payment: PaymentSettings; timeouts: TimeoutSettings };

const defaults: Settings = {
  store: { name: "OnlyPants", whatsapp: "", email: "", instagram: "", address: "", hours: "" },
  payment: { qris_image_url: "", merchant_name: "", is_dummy: true },
  timeouts: { quote_hours: 48, payment_hours: 24 },
};

export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_TAG);
  const rows = await db.select().from(schema.settings);
  const out = structuredClone(defaults) as Record<string, object>;
  for (const r of rows) out[r.key] = { ...(out[r.key] ?? {}), ...(r.value as object) };
  return out as Settings;
}
