import { describe, it, expect } from "vitest";
import type { Budget, Transaction } from "../db/types";
import {
  computeBudgetProgress,
  computeOverallBudgetUsage,
  monthKeyFromDate,
} from "./budgets";

function budget(partial: Partial<Budget> = {}): Budget {
  return {
    id: partial.id ?? "b1",
    name: partial.name ?? "Food",
    categoryId: partial.categoryId,
    limitMinor: partial.limitMinor ?? 10000,
    month: partial.month ?? "2024-05",
    createdAt: 0,
    updatedAt: 0,
  };
}

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    type: partial.type ?? "expense",
    amountMinor: partial.amountMinor ?? 0,
    categoryId: partial.categoryId ?? "cat-exp-food",
    description: "",
    date: partial.date ?? "2024-05-10",
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("monthKeyFromDate", () => {
  it("extracts the month key", () => {
    expect(monthKeyFromDate("2024-05-17")).toBe("2024-05");
  });
});

describe("computeBudgetProgress", () => {
  it("is zero with no transactions", () => {
    const p = computeBudgetProgress(budget(), []);
    expect(p.spentMinor).toBe(0);
    expect(p.status).toBe("normal");
  });

  it("sums matching expenses within the month", () => {
    const list = [
      tx({ amountMinor: 3000, date: "2024-05-10" }),
      tx({ amountMinor: 2000, date: "2024-05-20" }),
      tx({ amountMinor: 5000, date: "2024-06-01" }), // different month
      tx({ type: "income", amountMinor: 9999, date: "2024-05-15" }), // income excluded
    ];
    const p = computeBudgetProgress(budget({ limitMinor: 10000 }), list);
    expect(p.spentMinor).toBe(5000);
    expect(p.usedRatio).toBeCloseTo(0.5);
    expect(p.status).toBe("normal");
  });

  it("filters by category when set", () => {
    const list = [
      tx({ amountMinor: 3000, categoryId: "food", date: "2024-05-10" }),
      tx({ amountMinor: 4000, categoryId: "transport", date: "2024-05-11" }),
    ];
    const p = computeBudgetProgress(budget({ categoryId: "food", limitMinor: 10000 }), list);
    expect(p.spentMinor).toBe(3000);
  });

  it("flags near-limit and exceeded states", () => {
    const near = computeBudgetProgress(budget({ limitMinor: 10000 }), [tx({ amountMinor: 8500 })]);
    expect(near.status).toBe("near");
    const over = computeBudgetProgress(budget({ limitMinor: 10000 }), [tx({ amountMinor: 12000 })]);
    expect(over.status).toBe("exceeded");
    expect(over.remainingMinor).toBe(-2000);
  });
});

describe("computeOverallBudgetUsage", () => {
  const list = [
    tx({ amountMinor: 4000, categoryId: "food", date: "2024-05-10" }),
    tx({ amountMinor: 2000, categoryId: "transport", date: "2024-05-12" }),
  ];

  it("returns null when there are no budgets for the month", () => {
    expect(computeOverallBudgetUsage([], list, "2024-05")).toBeNull();
  });

  it("uses the all-categories budget alone when present (no double count)", () => {
    const budgets = [
      budget({ id: "all", categoryId: undefined, limitMinor: 10000 }),
      budget({ id: "food", categoryId: "food", limitMinor: 5000 }),
    ];
    const usage = computeOverallBudgetUsage(budgets, list, "2024-05");
    expect(usage?.count).toBe(1);
    expect(usage?.limitMinor).toBe(10000);
    expect(usage?.spentMinor).toBe(6000);
  });

  it("sums distinct category budgets when no all-budget exists", () => {
    const budgets = [
      budget({ id: "food", categoryId: "food", limitMinor: 5000 }),
      budget({ id: "transport", categoryId: "transport", limitMinor: 5000 }),
    ];
    const usage = computeOverallBudgetUsage(budgets, list, "2024-05");
    expect(usage?.count).toBe(2);
    expect(usage?.limitMinor).toBe(10000);
    expect(usage?.spentMinor).toBe(6000);
  });

  it("ignores budgets from other months", () => {
    const budgets = [budget({ month: "2024-06", limitMinor: 10000 })];
    expect(computeOverallBudgetUsage(budgets, list, "2024-05")).toBeNull();
  });
});
