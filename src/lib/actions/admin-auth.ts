"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { createAuthClient } from "@/lib/supabase/server";

export async function signIn(_: unknown, fd: FormData) {
  if (!(await rateLimit("admin-login", 10, 900))) return { error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Email atau password salah." };

  const [staff] = await db
    .select()
    .from(schema.staff)
    .where(and(eq(schema.staff.userId, data.user.id), eq(schema.staff.active, true)));
  if (!staff) {
    await supabase.auth.signOut();
    return { error: "Akun ini tidak punya akses admin." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
