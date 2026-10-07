import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// Supabase's transaction pooler (port 6543) does not support prepared statements.
const client =
  globalForDb.pg ??
  postgres(process.env.DATABASE_URL!, { prepare: false, max: process.env.VERCEL ? 1 : 5 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export { schema };
