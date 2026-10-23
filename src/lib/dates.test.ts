import { describe, it, expect } from "vitest";
import {
  resolveRange,
  addMonthsISO,
  addDaysISO,
  isWithinRange,
  daysBetween,
  monthKeyOf,
  startOfMonthISO,
  endOfMonthISO,
  compareISO,
} from "./dates";

describe("month bounds", () => {
  it("computes start and end of month", () => {
    expect(startOfMonthISO("2024-05-17")).toBe("2024-05-01");
    expect(endOfMonthISO("2024-05-17")).toBe("2024-05-31");
  });

  it("handles February in a leap year", () => {
    expect(endOfMonthISO("2024-02-10")).toBe("2024-02-29");
  });
});

describe("addMonthsISO", () => {
  it("adds months across year boundary", () => {
    expect(addMonthsISO("2024-12-15", 1)).toBe("2025-01-15");
  });

  it("clamps the day to the target month length", () => {
    expect(addMonthsISO("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonthsISO("2023-01-31", 1)).toBe("2023-02-28");
  });
});

describe("addDaysISO", () => {
  it("adds days", () => {
    expect(addDaysISO("2024-05-30", 3)).toBe("2024-06-02");
    expect(addDaysISO("2024-05-01", -1)).toBe("2024-04-30");
  });
});

describe("isWithinRange", () => {
  it("is inclusive of both bounds", () => {
    const range = { from: "2024-05-01", to: "2024-05-31" };
    expect(isWithinRange("2024-05-01", range)).toBe(true);
    expect(isWithinRange("2024-05-31", range)).toBe(true);
    expect(isWithinRange("2024-05-15", range)).toBe(true);
    expect(isWithinRange("2024-04-30", range)).toBe(false);
    expect(isWithinRange("2024-06-01", range)).toBe(false);
  });
});

describe("daysBetween", () => {
  it("counts inclusive days", () => {
    expect(daysBetween("2024-05-01", "2024-05-01")).toBe(1);
    expect(daysBetween("2024-05-01", "2024-05-31")).toBe(31);
  });
});

describe("monthKeyOf", () => {
  it("extracts the YYYY-MM key", () => {
    expect(monthKeyOf("2024-05-17")).toBe("2024-05");
  });
});

describe("compareISO", () => {
  it("orders dates", () => {
    expect(compareISO("2024-05-01", "2024-05-02")).toBe(-1);
    expect(compareISO("2024-05-02", "2024-05-01")).toBe(1);
    expect(compareISO("2024-05-01", "2024-05-01")).toBe(0);
  });
});

describe("resolveRange", () => {
  const ref = new Date(2024, 4, 17); // May 17 2024

  it("resolves thisMonth", () => {
    const r = resolveRange("thisMonth", undefined, ref);
    expect(r).toEqual({ from: "2024-05-01", to: "2024-05-31" });
  });

  it("resolves lastMonth across year boundary", () => {
    const r = resolveRange("lastMonth", undefined, new Date(2024, 0, 5)); // Jan 5
    expect(r).toEqual({ from: "2023-12-01", to: "2023-12-31" });
  });

  it("normalizes reversed custom ranges", () => {
    const r = resolveRange("custom", { from: "2024-05-20", to: "2024-05-05" }, ref);
    expect(r).toEqual({ from: "2024-05-05", to: "2024-05-20" });
  });
});
