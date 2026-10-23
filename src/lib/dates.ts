/**
 * Date helpers. Transaction calendar dates are stored as ISO "YYYY-MM-DD"
 * strings, which sort and compare correctly lexicographically. Timestamps
 * (createdAt/updatedAt) are epoch milliseconds.
 */

export type ISODate = string; // "YYYY-MM-DD"

/** Period presets supported by the dashboard and insights. */
export type PeriodPreset = "thisMonth" | "lastMonth" | "custom";

export interface DateRange {
  /** Inclusive ISO start date. */
  from: ISODate;
  /** Inclusive ISO end date. */
  to: ISODate;
}

/** Pad a number to a 2-digit string. */
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a Date as an ISO "YYYY-MM-DD" string in local time. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse an ISO "YYYY-MM-DD" string into a local Date (midnight). */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Today's date as an ISO string (local time). */
export function todayISO(): ISODate {
  return toISODate(new Date());
}

/** First day of the month containing the given ISO date. */
export function startOfMonthISO(iso: ISODate): ISODate {
  const d = fromISODate(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

/** Last day of the month containing the given ISO date. */
export function endOfMonthISO(iso: ISODate): ISODate {
  const d = fromISODate(iso);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return toISODate(last);
}

/** Add `count` months to an ISO date, clamping the day to the target month. */
export function addMonthsISO(iso: ISODate, count: number): ISODate {
  const d = fromISODate(iso);
  const target = new Date(d.getFullYear(), d.getMonth() + count, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return toISODate(target);
}

/** Move an ISO date forward by `count` calendar days. */
export function addDaysISO(iso: ISODate, count: number): ISODate {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + count);
  return toISODate(d);
}

/** Compute the inclusive date range for a period preset or custom range. */
export function resolveRange(
  preset: PeriodPreset,
  custom?: DateRange,
  reference: Date = new Date(),
): DateRange {
  const refISO = toISODate(reference);
  if (preset === "thisMonth") {
    return { from: startOfMonthISO(refISO), to: endOfMonthISO(refISO) };
  }
  if (preset === "lastMonth") {
    const prev = addMonthsISO(refISO, -1);
    return { from: startOfMonthISO(prev), to: endOfMonthISO(prev) };
  }
  // custom
  if (custom) {
    // Ensure from <= to regardless of input order.
    return custom.from <= custom.to
      ? { from: custom.from, to: custom.to }
      : { from: custom.to, to: custom.from };
  }
  return { from: startOfMonthISO(refISO), to: endOfMonthISO(refISO) };
}

/** Returns true when `iso` falls within the inclusive range. */
export function isWithinRange(iso: ISODate, range: DateRange): boolean {
  return iso >= range.from && iso <= range.to;
}

/** Number of inclusive days between two ISO dates (at least 1). */
export function daysBetween(from: ISODate, to: ISODate): number {
  const a = fromISODate(from).getTime();
  const b = fromISODate(to).getTime();
  const diff = Math.round((b - a) / 86_400_000) + 1;
  return diff > 0 ? diff : 1;
}

/** Compare two ISO dates: -1, 0, or 1 (for sorting). */
export function compareISO(a: ISODate, b: ISODate): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Start-of-day epoch ms for an ISO date. */
export function startOfDayMs(iso: ISODate): number {
  return fromISODate(iso).getTime();
}

/** A stable key for a month, e.g. "2024-05" (used for grouping/trends). */
export function monthKeyOf(iso: ISODate): string {
  return iso.slice(0, 7);
}

/**
 * Generate a list of ISO dates covering a range, one per day, capped to a
 * reasonable maximum to avoid runaway loops on very wide custom ranges.
 */
export function eachDay(range: DateRange, cap = 400): ISODate[] {
  const out: ISODate[] = [];
  let cursor = range.from;
  while (cursor <= range.to && out.length < cap) {
    out.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return out;
}
