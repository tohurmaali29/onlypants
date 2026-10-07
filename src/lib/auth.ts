import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createAuthClient } from "@/lib/supabase/server";

export type StaffUser = { id: string; name: string; email: string; role: "owner" | "staff" };

/** Current signed-in, active staff member (memoized per request), or null. */
export const getStaff = cache(async (): Promise<StaffUser | null> => {
  await connection(); // per-request: never prerender anything behind the session check
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const [row] = await db
    .select()
    .from(schema.staff)
    .where(and(eq(schema.staff.userId, userId), eq(schema.staff.active, true)));
  return row ? { id: row.userId, name: row.name, email: row.email, role: row.role } : null;
});

/**
 * Data-access-layer guard. Call at the top of every admin page AND every admin
 * Server Action: actions are public endpoints and don't inherit layout checks.
 */
export async function requireStaff(role?: "owner"): Promise<StaffUser> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (role === "owner" && staff.role !== "owner") redirect("/admin?denied=1");
  return staff;
}

export async function audit(actorId: string, action: string, entity: string, entityId: string | null, data: object = {}) {
  await db.insert(schema.auditLogs).values({ actorId, action, entity, entityId, data });
}
