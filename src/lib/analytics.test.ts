import { describe, it, expect } from "vitest";
import {
  totalExpenses,
  totalIncome,
  categoryBreakdown,
  comparePeriods,
  averageDailySpend,
  savingsRate,
  sliceShare,
  topCategories,
  previousRange,
} from "./analytics";
import { computeTotals } from "../services/transactions";
import type { Category, Transaction } from "../db/types";

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    type: partial.type ?? "expense",
    amountMinor: partial.amountMinor ?? 0,
    categoryId: partial.categoryId ?? "cat-exp-food",
    description: partial.description ?? "test",
    date: partial.date ?? "2024-05-10",
    createdAt: 0,
    updatedAt: 0,
  };
}

function cat(id: string, name: string, color = "#35D39A"): Category {
  return { id, name, type: "expense", icon: "shapes", color, isDefault: true, createdAt: 0, updatedAt: 0 };
}

describe("computeTotals / empty states", () => {
  it("returns zeros for an empty list", () => {
    expect(computeTotals([])).toEqual({ incomeMinor: 0, expenseMinor: 0, netMinor: 0 });
    expect(totalExpenses([])).toBe(0);
    expect(totalIncome([])).toBe(0);
  });

  it("separates income and expense", () => {
    const list = [
      tx({ type: "income", amountMinor: 50000 }),
      tx({ type: "expense", amountMinor: 12000 }),
      tx({ type: "expense", amountMinor: 3000 }),
    ];
    const totals = computeTotals(list);
    expect(totals.incomeMinor).toBe(50000);
    expect(totals.expenseMinor).toBe(15000);
    expect(totals.netMinor).toBe(35000);
  });
});

describe("categoryBreakdown", () => {
  it("returns empty for no expenses", () => {
    const map = new Map<string, Category>();
    expect(categoryBreakdown([], map)).toEqual([]);
  });

  it("groups expenses by category and sorts descending", () => {
    const categoriesById = new Map([
      ["a", cat("a", "Food")],
      ["b", cat("b", "Transport", "#6EA8FE")],
    ]);
    const list = [
      tx({ categoryId: "a", amountMinor: 500 }),
      tx({ categoryId: "a", amountMinor: 500 }),
      tx({ categoryId: "b", amountMinor: 300 }),
      tx({ type: "income", categoryId: "a", amountMinor: 9999 }), // excluded
    ];
    const slices = categoryBreakdown(list, categoriesById);
    expect(slices).toHaveLength(2);
    expect(slices[0]).toMatchObject({ id: "a", valueMinor: 1000 });
    expect(slices[1]).toMatchObject({ id: "b", valueMinor: 300 });
  });

  it("falls back for unknown categories", () => {
    const slices = categoryBreakdown([tx({ categoryId: "ghost", amountMinor: 100 })], new Map());
    expect(slices[0].name).toBe("Uncategorized");
  });
});

describe("sliceShare", () => {
  it("is safe on zero total", () => {
    expect(sliceShare(100, 0)).toBe(0);
    expect(sliceShare(50, 100)).toBe(0.5);
  });
});

describe("comparePeriods", () => {
  it("computes delta and ratio", () => {
    const c = comparePeriods(120, 100);
    expect(c.deltaMinor).toBe(20);
    expect(c.deltaRatio).toBeCloseTo(0.2);
    expect(c.direction).toBe("up");
  });

  it("returns null ratio when previous is zero", () => {
    const c = comparePeriods(50, 0);
    expect(c.deltaRatio).toBeNull();
    expect(c.direction).toBe("up");
  });
});

describe("averageDailySpend", () => {
  it("divides by day count", () => {
    expect(averageDailySpend(3100, 31)).toBe(100);
  });

  it("guards against zero days", () => {
    expect(averageDailySpend(100, 0)).toBe(100);
  });
});

describe("savingsRate", () => {
  it("computes rate when income is positive", () => {
    expect(savingsRate(100000, 60000)).toBeCloseTo(0.4);
  });

  it("is null with no income", () => {
    expect(savingsRate(0, 60000)).toBeNull();
  });
});

describe("topCategories", () => {
  it("limits to N", () => {
    const slices = [
      { id: "a", name: "a", valueMinor: 300, color: "#000" },
      { id: "b", name: "b", valueMinor: 200, color: "#000" },
      { id: "c", name: "c", valueMinor: 100, color: "#000" },
    ];
    expect(topCategories(slices, 2)).toHaveLength(2);
  });
});

describe("previousRange", () => {
  it("shifts to the preceding equal-length range", () => {
    const prev = previousRange({ from: "2024-05-10", to: "2024-05-20" });
    expect(prev.to).toBe("2024-05-09");
    expect(prev.from).toBe("2024-04-29");
  });
});
