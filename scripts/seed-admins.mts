/**
 * Creates the dummy owner and staff accounts (PRD Q6). Safe to re-run.
 *   npm run seed:admins
 * Against production, set the env vars to the hosted project and pass real
 * emails: OWNER_EMAIL=... STAFF_EMAIL=... ADMIN_PASSWORD=... npm run seed:admins
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

const accounts = [
  { email: process.env.OWNER_EMAIL ?? "owner@onlypants.test", name: "Owner OnlyPants", role: "owner" },
  { email: process.env.STAFF_EMAIL ?? "staff@onlypants.test", name: "Staff OnlyPants", role: "staff" },
] as const;
const password = process.env.ADMIN_PASSWORD ?? "onlypants123";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});
let created = 0;
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

for (const a of accounts) {
  // Look the account up in the database directly: listUsers is paginated and
  // its errors are easy to miss, which made re-runs try to create duplicates.
  const [existing] = await sql<{ id: string }[]>`select id from auth.users where lower(email) = lower(${a.email})`;
  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({ email: a.email, password, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    created++;
    console.log(`created ${a.role}: ${a.email}`);
  } else {
    console.log(`exists  ${a.role}: ${a.email} (password unchanged)`);
  }
  await sql`
    insert into staff (user_id, name, email, role) values (${userId}, ${a.name}, ${a.email}, ${a.role})
    on conflict (user_id) do update set role = excluded.role, active = true`;
}
if (created) console.log(`password for new accounts: ${password}`);
await sql.end();
