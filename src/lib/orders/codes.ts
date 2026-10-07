import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";

// No 0/O/1/I so codes can be read out over WhatsApp without confusion.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** OP-251007-7KQ2, dated in Jakarta time. */
export function newOrderCode(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `OP-${ymd}-${suffix}`;
}

function linkSecret() {
  const secret = process.env.ORDER_LINK_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("ORDER_LINK_SECRET is not set");
  return secret;
}

/**
 * Stable, unguessable key for an order's customer page (/order/CODE?k=KEY).
 * Derived from the code, so every email and WhatsApp message can carry the link.
 */
export function orderAccessKey(code: string) {
  return createHmac("sha256", linkSecret()).update(code.toUpperCase()).digest("base64url").slice(0, 32);
}

export function verifyAccessKey(code: string, key: string) {
  const a = Buffer.from(orderAccessKey(code));
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Pick a 1–999 unique code that no other open order is using. */
export function pickUniqueCode(taken: Set<number>) {
  const free: number[] = [];
  for (let n = 1; n <= 999; n++) if (!taken.has(n)) free.push(n);
  if (free.length === 0) throw new Error("No unique codes left: too many unpaid orders");
  return free[randomInt(free.length)];
}
