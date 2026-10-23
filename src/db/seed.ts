import type { Category } from "./types";
import { newId } from "../lib/id";
import { addDaysISO, addMonthsISO, endOfMonthISO, startOfMonthISO, todayISO } from "../lib/dates";

interface DefaultCategoryDef {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  builtinKey: string;
}

/** Starter expense categories. */
export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategoryDef[] = [
  { id: "cat-exp-food", name: "Food", type: "expense", icon: "food", color: "#F97316", builtinKey: "cat.food" },
  { id: "cat-exp-transport", name: "Transport", type: "expense", icon: "transport", color: "#6EA8FE", builtinKey: "cat.transport" },
  { id: "cat-exp-shopping", name: "Shopping", type: "expense", icon: "shopping", color: "#A78BFA", builtinKey: "cat.shopping" },
  { id: "cat-exp-bills", name: "Bills", type: "expense", icon: "bills", color: "#EF4444", builtinKey: "cat.bills" },
  { id: "cat-exp-education", name: "Education", type: "expense", icon: "education", color: "#38BDF8", builtinKey: "cat.education" },
  { id: "cat-exp-health", name: "Health", type: "expense", icon: "health", color: "#22C55E", builtinKey: "cat.health" },
  { id: "cat-exp-entertainment", name: "Entertainment", type: "expense", icon: "entertainment", color: "#EC4899", builtinKey: "cat.entertainment" },
  { id: "cat-exp-care", name: "Personal care", type: "expense", icon: "care", color: "#F59E0B", builtinKey: "cat.care" },
  { id: "cat-exp-family", name: "Family", type: "expense", icon: "family", color: "#14B8A6", builtinKey: "cat.family" },
  { id: "cat-exp-other", name: "Other", type: "expense", icon: "shapes", color: "#64748B", builtinKey: "cat.otherExpense" },
];

/** Starter income categories. */
export const DEFAULT_INCOME_CATEGORIES: DefaultCategoryDef[] = [
  { id: "cat-inc-salary", name: "Salary", type: "income", icon: "salary", color: "#35D39A", builtinKey: "cat.salary" },
  { id: "cat-inc-freelance", name: "Freelance", type: "income", icon: "freelance", color: "#6EA8FE", builtinKey: "cat.freelance" },
  { id: "cat-inc-business", name: "Business", type: "income", icon: "business", color: "#A78BFA", builtinKey: "cat.business" },
  { id: "cat-inc-gifts", name: "Gifts", type: "income", icon: "gift", color: "#EC4899", builtinKey: "cat.gifts" },
  { id: "cat-inc-allowance", name: "Allowance", type: "income", icon: "piggy", color: "#F59E0B", builtinKey: "cat.allowance" },
  { id: "cat-inc-other", name: "Other", type: "income", icon: "coins", color: "#64748B", builtinKey: "cat.otherIncome" },
];

const ALL_DEFAULTS: DefaultCategoryDef[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

/** Build the full set of default Category rows (with timestamps). */
export function buildDefaultCategories(): Category[] {
  const now = Date.now();
  return ALL_DEFAULTS.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    icon: d.icon,
    color: d.color,
    isDefault: true,
    builtinKey: d.builtinKey,
    createdAt: now,
    updatedAt: now,
  }));
}

/** The default expense-category IDs (convenience). */
export const DEFAULT_EXPENSE_IDS = DEFAULT_EXPENSE_CATEGORIES.map((c) => c.id);
export const DEFAULT_INCOME_IDS = DEFAULT_INCOME_CATEGORIES.map((c) => c.id);

/**
 * Generate a small, clearly-labeled set of demo transactions across the
 * current and previous month so first-time users can preview the app.
 * Returns raw transaction payloads (caller assigns IDs/timestamps).
 */
export interface DemoTransactionSeed {
  type: "income" | "expense";
  amountMinor: number;
  categoryId: string;
  description: string;
  dateOffsetDays: number; // relative to today (negative = past)
}

export function buildSampleTransactions(): Array<DemoTransactionSeed & { date: string }> {
  const seeds: DemoTransactionSeed[] = [
    { type: "income", amountMinor: 650000, categoryId: "cat-inc-salary", description: "Monthly salary", dateOffsetDays: -2 },
    { type: "expense", amountMinor: 18000, categoryId: "cat-exp-food", description: "Groceries", dateOffsetDays: -1 },
    { type: "expense", amountMinor: 7000, categoryId: "cat-exp-transport", description: "Bus pass", dateOffsetDays: -3 },
    { type: "expense", amountMinor: 12000, categoryId: "cat-exp-bills", description: "Electricity", dateOffsetDays: -4 },
    { type: "expense", amountMinor: 4500, categoryId: "cat-exp-entertainment", description: "Cinema", dateOffsetDays: -5 },
    { type: "expense", amountMinor: 25000, categoryId: "cat-exp-shopping", description: "New shoes", dateOffsetDays: -6 },
    { type: "expense", amountMinor: 9000, categoryId: "cat-exp-health", description: "Pharmacy", dateOffsetDays: -8 },
    { type: "income", amountMinor: 120000, categoryId: "cat-inc-freelance", description: "Logo design", dateOffsetDays: -9 },
    { type: "expense", amountMinor: 15000, categoryId: "cat-exp-education", description: "Course book", dateOffsetDays: -11 },
    { type: "expense", amountMinor: 6000, categoryId: "cat-exp-food", description: "Cafe", dateOffsetDays: -12 },
    // Previous month examples
    { type: "expense", amountMinor: 20000, categoryId: "cat-exp-food", description: "Market", dateOffsetDays: -34 },
    { type: "expense", amountMinor: 11000, categoryId: "cat-exp-transport", description: "Fuel", dateOffsetDays: -36 },
    { type: "expense", amountMinor: 30000, categoryId: "cat-exp-shopping", description: "Jacket", dateOffsetDays: -40 },
    { type: "income", amountMinor: 650000, categoryId: "cat-inc-salary", description: "Monthly salary", dateOffsetDays: -32 },
  ];
  return seeds.map((s) => ({
    ...s,
    date: addDaysISO(todayISO(), s.dateOffsetDays),
  }));
}

/** Materialize demo seeds into full Transaction rows. */
export function buildSampleTransactionRows(
  seeds: Array<DemoTransactionSeed & { date: string }>,
): import("./types").Transaction[] {
  const now = Date.now();
  return seeds.map((s) => ({
    id: newId(),
    type: s.type,
    amountMinor: s.amountMinor,
    categoryId: s.categoryId,
    description: s.description,
    date: s.date,
    createdAt: now,
    updatedAt: now,
  }));
}

/** Convenience re-export so callers can compute current/previous month bounds. */
export const monthBounds = {
  startOfMonthISO,
  endOfMonthISO,
  addMonthsISO,
};
