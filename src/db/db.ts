import Dexie, { type Table } from "dexie";
import type {
  AppSettings,
  Budget,
  Category,
  RecurringOccurrence,
  RecurringTemplate,
  SavingsGoal,
  Transaction,
} from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  currency: "MAD",
  language: "en",
  theme: "dark",
  onboarded: false,
  pinEnabled: false,
  lockOnResume: true,
  createdAt: 0,
  updatedAt: 0,
};

export const BACKUP_VERSION = 1;

export class PennyDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  goals!: Table<SavingsGoal, string>;
  recurring!: Table<RecurringTemplate, string>;
  occurrences!: Table<RecurringOccurrence, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("pennytrack");

    // Schema version 1. Add future versions with additional .version(n).stores()
    // calls so existing user data is upgraded in place without loss.
    this.version(1).stores({
      // Indexes used by list/filter/sort queries. `id` is the primary key.
      transactions: "id, date, type, categoryId, recurringTemplateId, createdAt",
      categories: "id, type, name",
      budgets: "id, month, categoryId",
      goals: "id, createdAt, targetDate",
      // Note: booleans (active/isDefault) are not valid IndexedDB keys, so they
      // are intentionally excluded from indexes and filtered in application code.
      recurring: "id, nextDate, type",
      occurrences: "id, templateId, date",
      settings: "id",
    });
  }
}

/** Lazily-initialised singleton database instance. */
export const db = new PennyDatabase();

/** Returns the current settings row, falling back to defaults. */
export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get("app");
  if (!row) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...row };
}

/** Persist a partial update of the settings singleton. */
export async function saveSettings(
  patch: Partial<Omit<AppSettings, "id">>,
): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = {
    ...current,
    ...patch,
    id: "app",
    updatedAt: Date.now(),
  };
  if (!current.createdAt) next.createdAt = Date.now();
  await db.settings.put(next);
  return next;
}
