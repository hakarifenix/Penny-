import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db/db";
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  filterTransactions,
  computeTotals,
  validateTransactionInput,
  reassignCategory,
  sumExpensesByCategory,
} from "./transactions";
import type { TransactionInput } from "./transactions";
import type { Transaction } from "../db/types";

function input(partial: Partial<TransactionInput> = {}): TransactionInput {
  return {
    type: "expense",
    amountMinor: 1500,
    categoryId: "cat-exp-food",
    description: "Groceries",
    date: "2024-05-10",
    ...partial,
  };
}

beforeEach(async () => {
  await db.transactions.clear();
});

describe("addTransaction", () => {
  it("persists a transaction with defaults", async () => {
    const tx = await addTransaction(input());
    expect(tx.id).toBeTruthy();
    expect(tx.amountMinor).toBe(1500);
    expect(tx.createdAt).toBeGreaterThan(0);
    expect(tx.updatedAt).toBeGreaterThan(0);
    const stored = await db.transactions.get(tx.id);
    expect(stored?.description).toBe("Groceries");
  });

  it("rejects a zero or negative amount", async () => {
    await expect(addTransaction(input({ amountMinor: 0 }))).rejects.toThrow();
    await expect(addTransaction(input({ amountMinor: -100 }))).rejects.toThrow();
  });

  it("rejects missing description or date", () => {
    expect(() => validateTransactionInput(input({ description: "  " }))).toThrow();
    expect(() => validateTransactionInput(input({ date: "" }))).toThrow();
    expect(() => validateTransactionInput(input({ categoryId: "" }))).toThrow();
  });
});

describe("updateTransaction", () => {
  it("updates fields and bumps updatedAt", async () => {
    const tx = await addTransaction(input());
    const updated = await updateTransaction(tx.id, { amountMinor: 2500, description: "Market" });
    expect(updated.amountMinor).toBe(2500);
    expect(updated.description).toBe("Market");
    expect(updated.updatedAt).toBeGreaterThanOrEqual(tx.updatedAt);
  });

  it("throws for a missing id", async () => {
    await expect(updateTransaction("nope", { amountMinor: 100 })).rejects.toThrow();
  });
});

describe("deleteTransaction", () => {
  it("removes the record", async () => {
    const tx = await addTransaction(input());
    await deleteTransaction(tx.id);
    expect(await db.transactions.get(tx.id)).toBeUndefined();
  });
});

describe("filterTransactions", () => {
  const list: Transaction[] = [
    { id: "1", type: "expense", amountMinor: 1000, categoryId: "food", description: "Lunch cafe", date: "2024-05-10", createdAt: 3, updatedAt: 3 },
    { id: "2", type: "income", amountMinor: 5000, categoryId: "salary", description: "Paycheck", date: "2024-05-01", createdAt: 2, updatedAt: 2 },
    { id: "3", type: "expense", amountMinor: 3000, categoryId: "transport", description: "Fuel", date: "2024-06-05", createdAt: 1, updatedAt: 1 },
  ];

  it("filters by type", () => {
    expect(filterTransactions(list, { type: "income" })).toHaveLength(1);
    expect(filterTransactions(list, { type: "expense" })).toHaveLength(2);
  });

  it("filters by category", () => {
    expect(filterTransactions(list, { categoryId: "food" })).toHaveLength(1);
  });

  it("filters by date range", () => {
    const r = filterTransactions(list, { range: { from: "2024-05-01", to: "2024-05-31" } });
    expect(r).toHaveLength(2);
  });

  it("searches description case-insensitively", () => {
    expect(filterTransactions(list, { search: "LUNCH" })).toHaveLength(1);
    expect(filterTransactions(list, { search: "pay" })).toHaveLength(1);
  });

  it("sorts by amount desc and asc", () => {
    expect(filterTransactions(list, { sortBy: "amount", sortDir: "desc" })[0].amountMinor).toBe(5000);
    expect(filterTransactions(list, { sortBy: "amount", sortDir: "asc" })[0].amountMinor).toBe(1000);
  });

  it("sorts by date desc default", () => {
    expect(filterTransactions(list, { sortBy: "date", sortDir: "desc" })[0].date).toBe("2024-06-05");
  });
});

describe("computeTotals and helpers", () => {
  it("computes totals", () => {
    const list: Transaction[] = [
      { id: "a", type: "income", amountMinor: 700, categoryId: "c", description: "", date: "2024-05-01", createdAt: 0, updatedAt: 0 },
      { id: "b", type: "expense", amountMinor: 200, categoryId: "c", description: "", date: "2024-05-02", createdAt: 0, updatedAt: 0 },
    ];
    expect(computeTotals(list)).toEqual({ incomeMinor: 700, expenseMinor: 200, netMinor: 500 });
  });

  it("sums expenses by category", () => {
    const list: Transaction[] = [
      { id: "a", type: "expense", amountMinor: 100, categoryId: "x", description: "", date: "2024-05-01", createdAt: 0, updatedAt: 0 },
      { id: "b", type: "expense", amountMinor: 250, categoryId: "x", description: "", date: "2024-05-02", createdAt: 0, updatedAt: 0 },
      { id: "c", type: "income", amountMinor: 999, categoryId: "x", description: "", date: "2024-05-03", createdAt: 0, updatedAt: 0 },
    ];
    const map = sumExpensesByCategory(list);
    expect(map.get("x")).toBe(350);
  });
});

describe("reassignCategory", () => {
  it("moves transactions to a fallback category", async () => {
    await db.transactions.bulkPut([
      { id: "t1", type: "expense", amountMinor: 1, categoryId: "old", description: "", date: "2024-05-01", createdAt: 0, updatedAt: 0 },
      { id: "t2", type: "expense", amountMinor: 1, categoryId: "old", description: "", date: "2024-05-02", createdAt: 0, updatedAt: 0 },
    ]);
    const moved = await reassignCategory("old", "new");
    expect(moved).toBe(2);
    expect((await db.transactions.get("t1"))?.categoryId).toBe("new");
  });
});
