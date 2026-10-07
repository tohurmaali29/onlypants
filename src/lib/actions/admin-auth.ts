"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";

// Staff sign in through the shared /[lang]/login page (see lib/actions/account.ts).
export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/id/login?next=/admin");
}
