import type { Category, Transaction } from "../db/types";
import type { DateRange, ISODate } from "./dates";
import { eachDay, monthKeyOf } from "./dates";
import type { TrendPoint, Slice } from "../components/charts/Charts";

/**
 * Pure analytics helpers. All functions take plain transaction arrays so they
 * are easily unit-tested and reused by both the dashboard and insights.
 */

/** Sum of expense amounts. */
export function totalExpenses(transactions: Transaction[]): number {
  return transactions.reduce(
    (acc, t) => (t.type === "expense" ? acc + t.amountMinor : acc),
    0,
  );
}

/** Sum of income amounts. */
export function totalIncome(transactions: Transaction[]): number {
  return transactions.reduce(
    (acc, t) => (t.type === "income" ? acc + t.amountMinor : acc),
    0,
  );
}

/**
 * Build a daily spending series across the range. Days without spending are
 * included as zero so the shape of the trend is honest. For very wide ranges
 * (>92 days) it groups by month instead to stay readable on small screens.
 */
export function buildSpendSeries(
  transactions: Transaction[],
  range: DateRange,
): TrendPoint[] {
  const expenses = transactions.filter((t) => t.type === "expense");
  const days = eachDay(range, 92);

  if (days.length > 92 || days.length === 0) {
    // Monthly aggregation fallback.
    const byMonth = new Map<string, number>();
    for (const t of expenses) {
      const key = monthKeyOf(t.date);
      byMonth.set(key, (byMonth.get(key) ?? 0) + t.amountMinor);
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, valueMinor]) => ({ label, valueMinor }));
  }

  const byDay = new Map<ISODate, number>(days.map((d) => [d, 0]));
  for (const t of expenses) {
    if (byDay.has(t.date)) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amountMinor);
  }
  return days.map((d) => ({
    // "5" style label for single months; "5 Mar" when crossing months.
    label: formatDayLabel(d, range),
    valueMinor: byDay.get(d) ?? 0,
  }));
}

function formatDayLabel(dateISO: ISODate, range: DateRange): string {
  const day = Number(dateISO.slice(8, 10));
  const startMonth = range.from.slice(5, 7);
  const endMonth = range.to.slice(5, 7);
  if (startMonth === endMonth) return String(day);
  const month = Number(dateISO.slice(5, 7));
  return `${day}/${month}`;
}

/** Build a per-category expense breakdown, sorted descending. */
export function categoryBreakdown(
  transactions: Transaction[],
  categoriesById: Map<string, Category>,
): Slice[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amountMinor);
  }
  const slices: Slice[] = Array.from(map.entries()).map(([id, valueMinor]) => {
    const cat = categoriesById.get(id);
    return {
      id,
      name: cat?.name ?? "Uncategorized",
      valueMinor,
      color: cat?.color ?? "#64748B",
    };
  });
  return slices.sort((a, b) => b.valueMinor - a.valueMinor);
}

/** Percentage of a slice relative to the total (0..1). Safe on zero total. */
export function sliceShare(sliceValue: number, total: number): number {
  return total > 0 ? sliceValue / total : 0;
}

export interface PeriodComparison {
  currentMinor: number;
  previousMinor: number;
  /** Absolute change (current - previous). */
  deltaMinor: number;
  /** Relative change (0.1 = +10%); null when previous is zero. */
  deltaRatio: number | null;
  /** Direction for rendering. */
  direction: "up" | "down" | "flat";
}

/** Compare a metric between the current and previous period. */
export function comparePeriods(currentMinor: number, previousMinor: number): PeriodComparison {
  const deltaMinor = currentMinor - previousMinor;
  const deltaRatio = previousMinor > 0 ? deltaMinor / previousMinor : null;
  const direction = deltaMinor > 0 ? "up" : deltaMinor < 0 ? "down" : "flat";
  return { currentMinor, previousMinor, deltaMinor, deltaRatio, direction };
}

/** Average daily spending across the range (minor units per day). */
export function averageDailySpend(expenseMinor: number, days: number): number {
  const safeDays = days > 0 ? days : 1;
  return Math.round(expenseMinor / safeDays);
}

/**
 * Savings rate = (income - expenses) / income, clamped to [-1, 1].
 * Returns null when there is no income (meaningless denominator).
 */
export function savingsRate(incomeMinor: number, expenseMinor: number): number | null {
  if (incomeMinor <= 0) return null;
  return (incomeMinor - expenseMinor) / incomeMinor;
}

/** Top N categories from a breakdown. */
export function topCategories(slices: Slice[], n = 3): Slice[] {
  return slices.slice(0, n);
}

/** Shift a range to the immediately preceding, equally-sized range. */
export function previousRange(range: DateRange): DateRange {
  const fromMs = Date.parse(range.from);
  const toMs = Date.parse(range.to);
  const span = toMs - fromMs;
  const prevTo = new Date(fromMs - 86_400_000);
  const prevFrom = new Date(prevTo.getTime() - span);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(prevFrom), to: iso(prevTo) };
}
