import { describe, it, expect } from "vitest";
import {
  toMinor,
  toMajor,
  parseAmountToMinor,
  formatMoney,
  sumMinor,
  formatNumber,
  CURRENCIES,
} from "./money";

describe("money minor-unit conversion", () => {
  it("converts major to minor units", () => {
    expect(toMinor(12.34)).toBe(1234);
    expect(toMinor("18")).toBe(1800);
    expect(toMinor(0)).toBe(0);
    expect(toMinor(1234.56)).toBe(123456);
  });

  it("returns null for non-finite input", () => {
    expect(toMinor("abc")).toBeNull();
    expect(toMinor(Number.NaN)).toBeNull();
    expect(toMinor(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("rounds floating point representation error correctly", () => {
    // 1.005 * 100 is 100.49999999999999 in binary; should round to 100 or 101.
    expect(toMinor(8.005)).toBe(801);
    expect(toMinor(0.29)).toBe(29);
    expect(toMinor(1.1 + 2.2)).toBe(330);
  });

  it("converts minor back to major", () => {
    expect(toMajor(1234)).toBeCloseTo(12.34, 5);
    expect(toMajor(1800)).toBe(18);
  });
});

describe("parseAmountToMinor", () => {
  it("parses plain and decimal-dot amounts", () => {
    expect(parseAmountToMinor("12.5")).toBe(1250);
    expect(parseAmountToMinor("12")).toBe(1200);
    expect(parseAmountToMinor("0.01")).toBe(1);
  });

  it("parses decimal comma and grouped amounts", () => {
    expect(parseAmountToMinor("12,50")).toBe(1250);
    expect(parseAmountToMinor("1 234,56")).toBe(123456);
    expect(parseAmountToMinor("1,234.56")).toBe(123456);
  });

  it("rejects invalid input", () => {
    expect(parseAmountToMinor("")).toBeNull();
    expect(parseAmountToMinor("abc")).toBeNull();
    expect(parseAmountToMinor(".")).toBeNull();
    expect(parseAmountToMinor("1.2.3")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats USD with grouping and cents", () => {
    expect(formatMoney(123456, { currency: "USD", locale: "en" })).toBe("$1,234.56");
  });

  it("formats negative amounts", () => {
    expect(formatMoney(-5000, { currency: "USD", locale: "en" })).toBe("-$50.00");
  });

  it("respects signDisplay", () => {
    expect(formatMoney(5000, { currency: "USD", locale: "en", signDisplay: "always" })).toBe("+$50.00");
  });

  it("uses the currency decimals", () => {
    expect(CURRENCIES.MAD.decimals).toBe(2);
    expect(CURRENCIES.EUR.decimals).toBe(2);
  });
});

describe("formatNumber", () => {
  it("groups numbers by locale", () => {
    expect(formatNumber(1234.56, "en", 1)).toBe("1,234.6");
  });
});

describe("sumMinor", () => {
  it("sums minor amounts exactly", () => {
    expect(sumMinor([100, 250, 3])).toBe(353);
    expect(sumMinor([])).toBe(0);
  });
});
