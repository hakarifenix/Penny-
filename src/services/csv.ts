import type { Category, Transaction } from "../db/types";
import type { CurrencyCode } from "../lib/money";
import { toMajor } from "../lib/money";

/** Escape a CSV field, quoting when needed. */
function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build a CSV string for a set of transactions.
 * Amounts are exported as plain major-unit numbers (no currency symbol) plus a
 * separate currency column, so spreadsheets parse them as numbers.
 */
export function transactionsToCSV(
  transactions: Transaction[],
  categoriesById: Map<string, Category>,
  currency: CurrencyCode,
): string {
  const headers = [
    "date",
    "time",
    "type",
    "category",
    "description",
    "amount",
    "currency",
    "notes",
    "tags",
  ];
  const lines: string[] = [headers.join(",")];

  // Sort by date ascending for a readable export.
  const sorted = transactions
    .slice()
    .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));

  for (const tx of sorted) {
    const category = categoriesById.get(tx.categoryId);
    const amountMajor = (toMajor(tx.amountMinor, currency) ).toFixed(2);
    const row = [
      tx.date,
      tx.time ?? "",
      tx.type,
      category?.name ?? "",
      tx.description,
      amountMajor,
      currency,
      tx.notes ?? "",
      (tx.tags ?? []).join("; "),
    ].map(escapeCell);
    lines.push(row.join(","));
  }

  // Prepend a UTF-8 BOM so Excel opens accents/Arabic correctly.
  return "\ufeff" + lines.join("\r\n");
}
