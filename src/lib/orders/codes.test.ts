import { describe, expect, it } from "vitest";
import { newOrderCode, orderAccessKey, pickUniqueCode, verifyAccessKey } from "./codes";

describe("order codes", () => {
  it("uses the Jakarta date", () => {
    // 2026-10-07 18:30 UTC is already 2026-10-08 in Jakarta (UTC+7)
    expect(newOrderCode(new Date("2026-10-07T18:30:00Z"))).toMatch(/^OP-261008-[2-9A-HJ-NP-Z]{4}$/);
  });
  it("derives a stable access key per order code", () => {
    const k = orderAccessKey("OP-261007-ABCD");
    expect(k).toHaveLength(32);
    expect(orderAccessKey("op-261007-abcd")).toBe(k);
    expect(verifyAccessKey("OP-261007-ABCD", k)).toBe(true);
    expect(verifyAccessKey("OP-261007-ABCE", k)).toBe(false);
    expect(verifyAccessKey("OP-261007-ABCD", "short")).toBe(false);
  });
});

describe("pickUniqueCode", () => {
  it("never returns a taken code", () => {
    const taken = new Set(Array.from({ length: 998 }, (_, i) => i + 1)); // only 999 free
    expect(pickUniqueCode(taken)).toBe(999);
  });
  it("throws when exhausted", () => {
    expect(() => pickUniqueCode(new Set(Array.from({ length: 999 }, (_, i) => i + 1)))).toThrow();
  });
});
