import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Fixed-window limiter stored in Postgres (no extra service needed on the free tier).
 * Keyed by client IP, or by `subject` (e.g. an email) when given. Keep per-IP limits
 * generous: Indonesian mobile carriers put many customers behind one CGNAT address.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number, subject?: string) {
  let id = subject?.trim().toLowerCase();
  if (!id) {
    const h = await headers();
    id = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  }
  const key = `${bucket}:${id}`;
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   then now() else rate_limits.window_start end
    returning count`);
  return rows[0].count <= limit;
}
