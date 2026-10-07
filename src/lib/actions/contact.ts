"use server";

import { after } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";

const input = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200),
  phone: z.string().trim().max(30).default(""),
  message: z.string().trim().min(5).max(2000),
  website: z.string().max(0).optional(), // honeypot
});

export async function sendContact(_: unknown, fd: FormData) {
  const p = input.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false as const, error: "invalid" as const };
  if (!(await rateLimit("contact", 5, 3600))) return { ok: false as const, error: "rateLimit" as const };
  const data = { name: p.data.name, email: p.data.email, phone: p.data.phone, message: p.data.message };
  await db.insert(schema.contactMessages).values(data);

  after(async () => {
    const { store } = await getSettings();
    const to = process.env.ADMIN_NOTIFY_EMAIL || store.email;
    if (!process.env.SMTP_HOST || !to) return;
    const port = Number(process.env.SMTP_PORT ?? 465);
    await nodemailer
      .createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
      .sendMail({
        from: process.env.MAIL_FROM,
        to,
        replyTo: data.email,
        subject: `[Kontak] Pesan dari ${data.name}`,
        text: `${data.message}\n\n— ${data.name} · ${data.email} · ${data.phone}`,
      })
      .catch((e) => console.error("contact mail failed", e));
  });
  return { ok: true as const };
}
