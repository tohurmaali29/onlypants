import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const hasAuthCookie = (request: NextRequest) => request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

/**
 * Refreshes the Supabase session cookies (customers and staff share one login).
 * Skipped for anonymous visitors so public pages stay cheap.
 */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  if (!hasAuthCookie(request)) return { response, signedIn: false };
  let res = response;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies, headers) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          res = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => res.headers.set(k, v));
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  res.headers.set("Cache-Control", "private, no-store");
  return { response: res, signedIn: !!data?.claims };
}

/** Admin area: refresh the session and send anonymous visitors to the shared login page. */
export async function refreshAdminSession(request: NextRequest) {
  const { response, signedIn } = await refreshSession(request, NextResponse.next({ request }));
  if (!signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/id/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return response;
}
