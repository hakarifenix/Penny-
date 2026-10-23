import { db } from "../db/db";
import type { Transaction, TxType } from "../db/types";
import { newId } from "../lib/id";
import { AppError } from "../lib/errors";
import { isWithinRange, type DateRange } from "../lib/dates";
import type { CurrencyCode } from "../lib/money";

/** Upper bound to keep parsed amounts sane (minor units). */
const MAX_AMOUNT_MINOR = 1_000_000_000_00; // 1,000,000,000.00

export interface TransactionInput {
  type: TxType;
  /** Positive integer minor units. */
  amountMinor: number;
  categoryId: string;
  description: string;
  /** "YYYY-MM-DD" */
  date: string;
  time?: string;
  notes?: string;
  tags?: string[];
}

export type SortField = "date" | "amount";
export type SortDir = "asc" | "desc";

export interface TransactionCriteria {
  search?: string;
  type?: TxType | "all";
  categoryId?: string | "all";
  range?: DateRange;
  sortBy?: SortField;
  sortDir?: SortDir;
  tag?: string;
}

/** Validate a transaction amount (positive integer minor units). */
export function validateAmount(amountMinor: number): boolean {
  return (
    Number.isFinite(amountMinor) &&
    Number.isInteger(amountMinor) &&
    amountMinor > 0 &&
    amountMinor <= MAX_AMOUNT_MINOR
  );
}

/** Validate the full input; throws AppError with per-field message keys. */
export function validateTransactionInput(input: TransactionInput): void {
  const fields: Record<string, string> = {};
  if (!validateAmount(input.amountMinor)) {
    fields.amountMinor = "tx.validation.amountInvalid";
  }
  if (!input.description || input.description.trim() === "") {
    fields.description = "tx.validation.description";
  }
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    fields.date = "tx.validation.date";
  }
  if (!input.categoryId) {
    fields.categoryId = "tx.validation.category";
  }
  if (Object.keys(fields).length > 0) {
    throw new AppError("VALIDATION", { fields });
  }
}

/** Create a new transaction. Returns the persisted row. */
export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  validateTransactionInput(input);
  const now = Date.now();
  const tx: Transaction = {
    id: newId(),
    type: input.type,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    description: input.description.trim(),
    date: input.date,
    time: input.time || undefined,
    notes: input.notes?.trim() || undefined,
    tags: input.tags?.map((t) => t.trim()).filter(Boolean),
    createdAt: now,
    updatedAt: now,
  };
  await db.transactions.put(tx);
  return tx;
}

/** Update an existing transaction. Throws if the id does not exist. */
export async function updateTransaction(
  id: string,
  patch: Partial<TransactionInput>,
): Promise<Transaction> {
  const existing = await db.transactions.get(id);
  if (!existing) throw new AppError("NOT_FOUND");
  const merged: TransactionInput = {
    type: patch.type ?? existing.type,
    amountMinor: patch.amountMinor ?? existing.amountMinor,
    categoryId: patch.categoryId ?? existing.categoryId,
    description: patch.description ?? existing.description,
    date: patch.date ?? existing.date,
    time: patch.time ?? existing.time,
    notes: patch.notes ?? existing.notes,
    tags: patch.tags ?? existing.tags,
  };
  validateTransactionInput(merged);
  const updated: Transaction = {
    ...existing,
    type: merged.type,
    amountMinor: merged.amountMinor,
    categoryId: merged.categoryId,
    description: merged.description.trim(),
    date: merged.date,
    time: merged.time || undefined,
    notes: merged.notes?.trim() || undefined,
    tags: merged.tags?.map((t) => t.trim()).filter(Boolean),
    updatedAt: Date.now(),
  };
  await db.transactions.put(updated);
  return updated;
}

/** Delete a transaction by id. */
export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

/**
 * Pure filter + sort over an in-memory list. Used by live queries and tests.
 * Search matches description, notes and tags (case-insensitive).
 */
export function filterTransactions(
  transactions: Transaction[],
  criteria: TransactionCriteria = {},
): Transaction[] {
  const {
    search,
    type = "all",
    categoryId = "all",
    range,
    sortBy = "date",
    sortDir = "desc",
    tag,
  } = criteria;

  const needle = search?.trim().toLowerCase();

  let result = transactions.filter((tx) => {
    if (type !== "all" && tx.type !== type) return false;
    if (categoryId !== "all" && tx.categoryId !== categoryId) return false;
    if (range && !isWithinRange(tx.date, range)) return false;
    if (tag && !(tx.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase())) {
      return false;
    }
    if (needle) {
      const hay = `${tx.description} ${tx.notes ?? ""} ${(tx.tags ?? []).join(" ")}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const dir = sortDir === "asc" ? 1 : -1;
  result = result.slice().sort((a, b) => {
    if (sortBy === "amount") {
      if (a.amountMinor === b.amountMinor) return compareTiebreak(a, b, dir);
      return (a.amountMinor - b.amountMinor) * dir;
    }
    // date sort
    if (a.date === b.date) return compareTiebreak(a, b, dir);
    return a.date < b.date ? -dir : dir;
  });

  return result;
}

/** Stable tie-break: newer createdAt first for desc, then id. */
function compareTiebreak(a: Transaction, b: Transaction, dir: number): number {
  if (a.createdAt !== b.createdAt) return (a.createdAt - b.createdAt) * dir;
  return a.id < b.id ? -dir : a.id > b.id ? dir : 0;
}

export interface Totals {
  incomeMinor: number;
  expenseMinor: number;
  /** income - expense (can be negative). */
  netMinor: number;
}

/** Compute income/expense/net totals for a set of transactions. */
export function computeTotals(transactions: Transaction[]): Totals {
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const tx of transactions) {
    if (tx.type === "income") incomeMinor += tx.amountMinor;
    else expenseMinor += tx.amountMinor;
  }
  return { incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor };
}

/** Filter to expense-only transactions. */
export function expensesOnly(transactions: Transaction[]): Transaction[] {
  return transactions.filter((t) => t.type === "expense");
}

/** Group expense totals by category id. Returns a map. */
export function sumExpensesByCategory(
  transactions: Transaction[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amountMinor);
  }
  return map;
}

/** Reassign transactions from a deleted category to a fallback category. */
export async function reassignCategory(
  fromCategoryId: string,
  toCategoryId: string,
): Promise<number> {
  const affected = await db.transactions.where("categoryId").equals(fromCategoryId).toArray();
  if (affected.length === 0) return 0;
  const now = Date.now();
  await db.transactions.bulkPut(
    affected.map((tx) => ({ ...tx, categoryId: toCategoryId, updatedAt: now })),
  );
  return affected.length;
}

/** Currency code is passed in for validation context (kept for future use). */
export type { CurrencyCode };
