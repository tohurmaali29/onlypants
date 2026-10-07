"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { SETTINGS_TAG } from "@/lib/settings";
import { createServiceClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const schemas = {
  store: z.object({
    name: z.string().trim().min(2).max(60),
    whatsapp: z.string().transform((v, ctx) => {
      const p = normalizePhone(v);
      if (!p) ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid" });
      return p ?? "";
    }),
    email: z.email(),
    instagram: z.string().trim().max(40).transform((v) => v.replace(/^@/, "")),
    address: z.string().trim().max(200),
    hours: z.string().trim().max(60),
  }),
  payment: z.object({
    qris_image_url: z.string().trim().min(1, "Upload gambar QRIS"),
    merchant_name: z.string().trim().min(2).max(80),
    is_dummy: z.boolean(),
  }),
  timeouts: z.object({
    quote_hours: z.number().int().min(1).max(168),
    payment_hours: z.number().int().min(1).max(72),
  }),
};

export async function saveSettingsAction(key: keyof typeof schemas, value: unknown): Promise<Result> {
  const staff = await requireStaff("owner");
  const schemaFor = schemas[key];
  if (!schemaFor) return { ok: false, error: "Pengaturan tidak dikenal" };
  const p = schemaFor.safeParse(value);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  await db
    .insert(schema.settings)
    .values({ key, value: p.data })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: p.data, updatedAt: new Date() } });
  await audit(staff.id, "settings.update", "settings", key, p.data);
  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true };
}

export async function createQrisUploadAction(type: string, size: number) {
  await requireStaff("owner");
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[type];
  if (!ext || size > 3 * 1024 * 1024) return { ok: false as const, error: "Gambar QRIS harus PNG/JPG/WEBP maks 3 MB" };
  const path = `qris/${Date.now()}.${ext}`;
  const { data, error } = await createServiceClient().storage.from("store-assets").createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "Gagal menyiapkan upload" };
  return { ok: true as const, path, token: data.token };
}

export async function qrisPublicUrlAction(path: string) {
  await requireStaff("owner");
  if (!/^qris\/\d+\.(png|jpg|webp)$/.test(path)) return null;
  return createServiceClient().storage.from("store-assets").getPublicUrl(path).data.publicUrl;
}
