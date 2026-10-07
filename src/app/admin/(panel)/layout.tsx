import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/site/header";
import { AdminNav, AdminNavFallback } from "@/components/admin/nav";
import { requireStaff } from "@/lib/auth";
import { signOut } from "@/lib/actions/admin-auth";

// Every admin view depends on the session, so navigations are allowed to wait on the server.
export const instant = false;

async function Frame({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 z-40 border-b border-line bg-surface md:h-dvh md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:block md:px-5 md:py-6">
          <div>
            <Logo />
            <p className="text-xs text-muted md:mt-1">Admin</p>
          </div>
          <form action={signOut} className="md:hidden">
            <button className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Keluar">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
        <Suspense fallback={<AdminNavFallback owner={staff.role === "owner"} />}>
          <AdminNav owner={staff.role === "owner"} />
        </Suspense>
        <div className="absolute inset-x-0 bottom-0 hidden border-t border-line p-4 md:block">
          <p className="truncate text-sm font-medium">{staff.name}</p>
          <p className="text-xs text-muted capitalize">{staff.role}</p>
          <form action={signOut} className="mt-3">
            <button className="flex items-center gap-2 text-sm text-muted hover:text-fg">
              <LogOut className="size-4" /> Keluar
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-muted">Memuat…</div>}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}
