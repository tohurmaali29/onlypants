import { NextResponse, type NextRequest } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { defaultLocale, isLocale, LOCALE_COOKIE, locales } from "@/lib/i18n/config";
import { refreshAdminSession, refreshSession } from "@/lib/supabase/proxy";

function preferredLocale(request: NextRequest) {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const languages = new Negotiator({
    headers: { "accept-language": request.headers.get("accept-language") ?? "" },
  }).languages();
  try {
    return match(languages, locales, defaultLocale);
  } catch {
    return defaultLocale;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/id/login";
    url.search = "?next=/admin";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin")) return refreshAdminSession(request);

  const first = pathname.split("/")[1];
  if (isLocale(first)) return (await refreshSession(request, NextResponse.next({ request }))).response;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals, and files with an extension.
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
