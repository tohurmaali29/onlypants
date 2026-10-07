import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

/** Landing point for Supabase email links (password reset, email confirmation). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/id/account";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/id/account";

  if (code) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const lang = next.split("/")[1] === "en" ? "en" : "id";
  return NextResponse.redirect(new URL(`/${lang}/login?error=link`, url.origin));
}
