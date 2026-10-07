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
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

for (const a of accounts) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email === a.email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({ email: a.email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
    console.log(`created ${a.role}: ${a.email}`);
  } else {
    console.log(`exists  ${a.role}: ${a.email}`);
  }
  await sql`
    insert into staff (user_id, name, email, role) values (${user.id}, ${a.name}, ${a.email}, ${a.role})
    on conflict (user_id) do update set role = excluded.role, active = true`;
}
console.log(`password: ${password}`);
await sql.end();
