"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const KEY = "op_nav";
type Nav = { prev: string | null; current: string };

function read(): Nav | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

/** Remembers the previous in-store URL for this tab. Render inside <Suspense>. */
export function NavHistory() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const url = pathname + (search ? `?${search}` : "");
    const nav = read();
    if (nav?.current === url) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ prev: nav?.current ?? null, current: url } satisfies Nav));
    } catch {}
  }, [pathname, search]);
  return null;
}

/**
 * "Back to shop" link. When the visitor came from another page of the store it
 * behaves like the browser back button, so the list reopens at the same scroll
 * position; on a direct visit (shared link) it navigates to `href` instead.
 */
export function BackLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (read()?.prev) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {children}
    </Link>
  );
}
