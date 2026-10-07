import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { StaffManager } from "@/components/admin/staff-manager";
import { PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { db, schema } from "@/lib/db";

// Reads the session on every request (see (panel)/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireStaff("owner");
  const rows = await db.select().from(schema.staff).orderBy(asc(schema.staff.createdAt));
  return (
    <>
      <PageHeader title="Staff" />
      <StaffManager
        meId={me.id}
        staff={rows.map((r) => ({ id: r.userId, name: r.name, email: r.email, role: r.role, active: r.active }))}
      />
    </>
  );
}
