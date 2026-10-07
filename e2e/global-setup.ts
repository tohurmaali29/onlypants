// Makes the E2E run repeatable on the local database: releases holds left by
// earlier (possibly failed) test orders and restocks the items the tests buy.
import { config } from "dotenv";
import postgres from "postgres";

export default async function globalSetup() {
  config({ path: ".env.local", quiet: true });
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    await sql`select release_order(id, 'cancelled', 'e2e cleanup', null) from orders
              where status in ('awaiting_quote','awaiting_payment','payment_review') and email like '%@example.com'`;
    await sql`update variants v set stock_on_hand = greatest(v.stock_on_hand, v.reserved + 20)
              from products p where p.id = v.product_id and p.slug = 'onlypants-gray-sweatpants'`;
    await sql`delete from rate_limits`;
  } finally {
    await sql.end();
  }
}
