import { describe, expect, it } from "vitest";
import { formatPrice, normalizePhone } from "./format";

describe("formatPrice", () => {
  it("formats rupiah per locale", () => {
    expect(formatPrice(1800000, "id")).toBe("Rp 1.800.000");
    expect(formatPrice(1800000, "en")).toBe("IDR 1,800,000");
  });
});

describe("normalizePhone", () => {
  it("accepts common Indonesian formats", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizePhone("81234567890")).toBe("6281234567890");
  });
  it("rejects garbage", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("021555123")).toBeNull();
  });
});
