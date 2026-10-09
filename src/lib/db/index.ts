import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local (or set it in Vercel).");
}

// Production uses Supabase's *session* pooler (port 5432). Its transaction pooler
// (6543) hangs when postgres.js pipelines parallel queries over one connection.
// Small per-instance pool + idle timeout keeps us inside the free tier's connection limit.
const client =
  globalForDb.pg ??
  postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: process.env.VERCEL ? 2 : 5,
    idle_timeout: process.env.VERCEL ? 20 : undefined,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export { schema };
