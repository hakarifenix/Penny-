import { db } from "../db/db";
import type { Budget, Transaction } from "../db/types";
import { newId } from "../lib/id";
import { AppError } from "../lib/errors";
import { startOfMonthISO, endOfMonthISO, isWithinRange } from "../lib/dates";
import { validateAmount } from "./transactions";

/** A "YYYY-MM" month key, e.g. "2024-05". */
export type MonthKey = string;

export function monthKeyFromDate(dateISO: string): MonthKey {
  return dateISO.slice(0, 7);
}

export interface BudgetInput {
  name: string;
  /** undefined = all expense categories. */
  categoryId?: string;
  /** Positive integer minor units. */
  limitMinor: number;
  /** "YYYY-MM" month this budget applies to. */
  month: MonthKey;
  startDate?: string;
}

function validateBudgetInput(input: BudgetInput): void {
  const fields: Record<string, string> = {};
  if (!input.name || input.name.trim() === "") fields.name = "budget.validation.name";
  if (!validateAmount(input.limitMinor)) fields.limitMinor = "budget.validation.limit";
  if (!/^\d{4}-\d{2}$/.test(input.month)) fields.month = "budget.validation.limit";
  if (Object.keys(fields).length > 0) throw new AppError("VALIDATION", { fields });
}

/** Create a budget. */
export async function addBudget(input: BudgetInput): Promise<Budget> {
  validateBudgetInput(input);
  const now = Date.now();
  const budget: Budget = {
    id: newId(),
    name: input.name.trim(),
    categoryId: input.categoryId,
    limitMinor: input.limitMinor,
    month: input.month,
    startDate: input.startDate,
    createdAt: now,
    updatedAt: now,
  };
  await db.budgets.put(budget);
  return budget;
}

/** Update a budget. */
export async function updateBudget(id: string, patch: Partial<BudgetInput>): Promise<Budget> {
  const existing = await db.budgets.get(id);
  if (!existing) throw new AppError("NOT_FOUND");
  const merged: BudgetInput = {
    name: patch.name ?? existing.name,
    categoryId: patch.categoryId !== undefined ? patch.categoryId : existing.categoryId,
    limitMinor: patch.limitMinor ?? existing.limitMinor,
    month: patch.month ?? existing.month,
    startDate: patch.startDate ?? existing.startDate,
  };
  validateBudgetInput(merged);
  const updated: Budget = {
    ...existing,
    name: merged.name.trim(),
    categoryId: merged.categoryId,
    limitMinor: merged.limitMinor,
    month: merged.month,
    startDate: merged.startDate,
    updatedAt: Date.now(),
  };
  await db.budgets.put(updated);
  return updated;
}

/** Delete a budget. */
export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

export type BudgetStatus = "normal" | "near" | "exceeded";

export interface BudgetProgress {
  spentMinor: number;
  remainingMinor: number;
  /** 0..n (can exceed 1 when over budget). */
  usedRatio: number;
  status: BudgetStatus;
}

/** Threshold (fraction) at which a budget is considered "approaching". */
export const NEAR_LIMIT_THRESHOLD = 0.8;

/**
 * Compute spending against a budget.
 * Only expense transactions in the budget's month (and category, if set) count.
 * Income is always excluded to avoid double counting.
 */
export function computeBudgetProgress(
  budget: Budget,
  transactions: Transaction[],
): BudgetProgress {
  const range = {
    from: startOfMonthISO(`${budget.month}-01`),
    to: endOfMonthISO(`${budget.month}-01`),
  };
  let spentMinor = 0;
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    if (budget.categoryId && tx.categoryId !== budget.categoryId) continue;
    if (!isWithinRange(tx.date, range)) continue;
    spentMinor += tx.amountMinor;
  }
  const remainingMinor = budget.limitMinor - spentMinor;
  const usedRatio = budget.limitMinor > 0 ? spentMinor / budget.limitMinor : 0;
  let status: BudgetStatus = "normal";
  if (usedRatio >= 1) status = "exceeded";
  else if (usedRatio >= NEAR_LIMIT_THRESHOLD) status = "near";
  return { spentMinor, remainingMinor, usedRatio, status };
}

/** Compute progress for a list of budgets at once. */
export function computeAllBudgets(
  budgets: Budget[],
  transactions: Transaction[],
): Array<{ budget: Budget; progress: BudgetProgress }> {
  return budgets.map((budget) => ({
    budget,
    progress: computeBudgetProgress(budget, transactions),
  }));
}

export interface OverallBudgetUsage {
  limitMinor: number;
  spentMinor: number;
  usedRatio: number;
  status: BudgetStatus;
  count: number;
}

/**
 * Aggregate monthly budget usage for the dashboard, avoiding double counting:
 * - If an "all categories" budget exists for the month, it alone represents
 *   overall spending.
 * - Otherwise category budgets (each a distinct category) are summed.
 * Returns null when there are no budgets for the month.
 */
export function computeOverallBudgetUsage(
  budgets: Budget[],
  transactions: Transaction[],
  month: MonthKey,
): OverallBudgetUsage | null {
  const monthBudgets = budgets.filter((b) => b.month === month);
  if (monthBudgets.length === 0) return null;

  const allBudget = monthBudgets.find((b) => !b.categoryId);
  if (allBudget) {
    const p = computeBudgetProgress(allBudget, transactions);
    return {
      limitMinor: allBudget.limitMinor,
      spentMinor: p.spentMinor,
      usedRatio: p.usedRatio,
      status: p.status,
      count: 1,
    };
  }

  let limitMinor = 0;
  let spentMinor = 0;
  for (const b of monthBudgets) {
    limitMinor += b.limitMinor;
    spentMinor += computeBudgetProgress(b, transactions).spentMinor;
  }
  const usedRatio = limitMinor > 0 ? spentMinor / limitMinor : 0;
  let status: BudgetStatus = "normal";
  if (usedRatio >= 1) status = "exceeded";
  else if (usedRatio >= NEAR_LIMIT_THRESHOLD) status = "near";
  return { limitMinor, spentMinor, usedRatio, status, count: monthBudgets.length };
}
