"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Package, Settings, ShoppingCart, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon; owner?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Pesanan", icon: ShoppingCart },
  { href: "/admin/products", label: "Produk & Stok", icon: Package },
  { href: "/admin/reports", label: "Laporan", icon: BarChart3, owner: true },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings, owner: true },
  { href: "/admin/staff", label: "Staff", icon: Users, owner: true },
];

function NavList({ owner, active }: { owner: boolean; active?: string }) {
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-0 [scrollbar-width:none]">
      {ITEMS.filter((i) => owner || !i.owner).map(({ href, label, icon: Icon }) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
              isActive ? "bg-primary text-white" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminNav({ owner }: { owner: boolean }) {
  const pathname = usePathname();
  const active = ITEMS.map((i) => i.href)
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return <NavList owner={owner} active={active} />;
}

// Separate export: properties on a client component can't be read from a Server Component.
export function AdminNavFallback({ owner }: { owner: boolean }) {
  return <NavList owner={owner} />;
}
