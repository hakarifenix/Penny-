import { db, DEFAULT_SETTINGS, BACKUP_VERSION } from "../db/db";
import type {
  AppSettings,
  BackupPayload,
  Budget,
  Category,
  RecurringTemplate,
  SavingsGoal,
  Transaction,
} from "../db/types";
import { AppError } from "../lib/errors";
import { CURRENCY_CODES } from "../lib/money";
import { buildDefaultCategories } from "../db/seed";

const LANGUAGES = ["en", "fr", "ar"];
const THEMES = ["dark", "light", "system"];
const TX_TYPES = ["income", "expense"];
const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

function isNonNegInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function invalid(): never {
  throw new AppError("INVALID_BACKUP", { messageKey: "settings.importInvalid" });
}

/** Collect the full contents of the database into a serializable payload. */
export async function buildBackup(): Promise<BackupPayload> {
  const [settings, categories, transactions, budgets, goals, recurring] =
    await Promise.all([
      db.settings.get("app"),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.budgets.toArray(),
      db.goals.toArray(),
      db.recurring.toArray(),
    ]);
  return {
    app: "pennytrack",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS, ...(settings ?? { id: "app" as const }) },
    categories,
    transactions,
    budgets,
    goals,
    recurring,
  };
}

/**
 * Validate an untrusted object into a BackupPayload.
 * Throws AppError("INVALID_BACKUP") on any structural problem. Never mutates
 * the database — safe to call before deciding how to import.
 */
export function validateBackup(raw: unknown): BackupPayload {
  if (!isObject(raw)) invalid();
  if (raw.app !== "pennytrack") invalid();
  if (typeof raw.version !== "number" || raw.version > BACKUP_VERSION) invalid();

  const rawSettings = isObject(raw.settings) ? raw.settings : {};
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    id: "app",
    currency: CURRENCY_CODES.includes(rawSettings.currency as never)
      ? (rawSettings.currency as AppSettings["currency"])
      : DEFAULT_SETTINGS.currency,
    language: LANGUAGES.includes(rawSettings.language as string)
      ? (rawSettings.language as AppSettings["language"])
      : DEFAULT_SETTINGS.language,
    theme: THEMES.includes(rawSettings.theme as string)
      ? (rawSettings.theme as AppSettings["theme"])
      : DEFAULT_SETTINGS.theme,
    onboarded: typeof rawSettings.onboarded === "boolean" ? rawSettings.onboarded : true,
    pinEnabled: rawSettings.pinEnabled === true,
    pinHash: typeof rawSettings.pinHash === "string" ? rawSettings.pinHash : undefined,
    pinSalt: typeof rawSettings.pinSalt === "string" ? rawSettings.pinSalt : undefined,
    lockOnResume:
      typeof rawSettings.lockOnResume === "boolean"
        ? rawSettings.lockOnResume
        : DEFAULT_SETTINGS.lockOnResume,
    createdAt: typeof rawSettings.createdAt === "number" ? rawSettings.createdAt : 0,
    updatedAt: typeof rawSettings.updatedAt === "number" ? rawSettings.updatedAt : 0,
  };

  const categories: Category[] = [];
  if (raw.categories !== undefined) {
    if (!Array.isArray(raw.categories)) invalid();
    for (const c of raw.categories) {
      if (!isObject(c)) invalid();
      if (typeof c.id !== "string" || typeof c.name !== "string") invalid();
      if (!TX_TYPES.includes(c.type as string)) invalid();
      categories.push({
        id: c.id,
        name: c.name,
        type: c.type as Category["type"],
        icon: typeof c.icon === "string" ? c.icon : "shapes",
        color: typeof c.color === "string" ? c.color : "#64748B",
        isDefault: c.isDefault === true,
        builtinKey: typeof c.builtinKey === "string" ? c.builtinKey : undefined,
        createdAt: typeof c.createdAt === "number" ? c.createdAt : 0,
        updatedAt: typeof c.updatedAt === "number" ? c.updatedAt : 0,
      });
    }
  }

  const transactions: Transaction[] = [];
  if (!Array.isArray(raw.transactions)) invalid();
  for (const t of raw.transactions) {
    if (!isObject(t)) invalid();
    if (typeof t.id !== "string") invalid();
    if (!TX_TYPES.includes(t.type as string)) invalid();
    if (!isPositiveInt(t.amountMinor)) invalid();
    if (typeof t.categoryId !== "string") invalid();
    if (typeof t.description !== "string") invalid();
    if (typeof t.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) invalid();
    transactions.push({
      id: t.id,
      type: t.type as Transaction["type"],
      amountMinor: t.amountMinor,
      categoryId: t.categoryId,
      description: t.description,
      date: t.date,
      time: typeof t.time === "string" ? t.time : undefined,
      notes: typeof t.notes === "string" ? t.notes : undefined,
      tags: Array.isArray(t.tags) ? t.tags.filter((x): x is string => typeof x === "string") : undefined,
      recurringTemplateId:
        typeof t.recurringTemplateId === "string" ? t.recurringTemplateId : undefined,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : 0,
      updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : 0,
    });
  }

  const budgets: Budget[] = [];
  if (raw.budgets !== undefined) {
    if (!Array.isArray(raw.budgets)) invalid();
    for (const b of raw.budgets) {
      if (!isObject(b)) invalid();
      if (typeof b.id !== "string" || typeof b.name !== "string") invalid();
      if (!isPositiveInt(b.limitMinor)) invalid();
      if (typeof b.month !== "string") invalid();
      budgets.push({
        id: b.id,
        name: b.name,
        categoryId: typeof b.categoryId === "string" ? b.categoryId : undefined,
        limitMinor: b.limitMinor,
        month: b.month,
        startDate: typeof b.startDate === "string" ? b.startDate : undefined,
        createdAt: typeof b.createdAt === "number" ? b.createdAt : 0,
        updatedAt: typeof b.updatedAt === "number" ? b.updatedAt : 0,
      });
    }
  }

  const goals: SavingsGoal[] = [];
  if (raw.goals !== undefined) {
    if (!Array.isArray(raw.goals)) invalid();
    for (const g of raw.goals) {
      if (!isObject(g)) invalid();
      if (typeof g.id !== "string" || typeof g.name !== "string") invalid();
      if (!isPositiveInt(g.targetMinor)) invalid();
      if (!isNonNegInt(g.savedMinor)) invalid();
      goals.push({
        id: g.id,
        name: g.name,
        targetMinor: g.targetMinor,
        savedMinor: g.savedMinor,
        targetDate: typeof g.targetDate === "string" ? g.targetDate : undefined,
        createdAt: typeof g.createdAt === "number" ? g.createdAt : 0,
        updatedAt: typeof g.updatedAt === "number" ? g.updatedAt : 0,
      });
    }
  }

  const recurring: RecurringTemplate[] = [];
  if (raw.recurring !== undefined) {
    if (!Array.isArray(raw.recurring)) invalid();
    for (const r of raw.recurring) {
      if (!isObject(r)) invalid();
      if (typeof r.id !== "string" || typeof r.name !== "string") invalid();
      if (!TX_TYPES.includes(r.type as string)) invalid();
      if (!isPositiveInt(r.amountMinor)) invalid();
      if (typeof r.categoryId !== "string") invalid();
      if (!FREQUENCIES.includes(r.frequency as string)) invalid();
      if (typeof r.nextDate !== "string") invalid();
      recurring.push({
        id: r.id,
        name: r.name,
        type: r.type as RecurringTemplate["type"],
        amountMinor: r.amountMinor,
        categoryId: r.categoryId,
        frequency: r.frequency as RecurringTemplate["frequency"],
        nextDate: r.nextDate,
        notes: typeof r.notes === "string" ? r.notes : undefined,
        autoPost: r.autoPost === true,
        active: r.active !== false,
        createdAt: typeof r.createdAt === "number" ? r.createdAt : 0,
        updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
      });
    }
  }

  return {
    app: "pennytrack",
    version: BACKUP_VERSION,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : new Date().toISOString(),
    settings,
    categories,
    transactions,
    budgets,
    goals,
    recurring,
  };
}

export type ImportMode = "merge" | "replace";

/**
 * Import a validated backup.
 * - "replace": clears existing data inside a single transaction, then writes
 *   the backup. If validation already passed, this cannot leave a half state.
 * - "merge": upserts records by id, preserving records not in the backup.
 * A malformed payload throws before any write, so existing data is safe.
 */
export async function importBackup(payload: BackupPayload, mode: ImportMode): Promise<void> {
  if (mode === "replace") {
    await db.transaction(
      "rw",
      [db.transactions, db.categories, db.budgets, db.goals, db.recurring, db.occurrences, db.settings],
      async () => {
        await Promise.all([
          db.transactions.clear(),
          db.categories.clear(),
          db.budgets.clear(),
          db.goals.clear(),
          db.recurring.clear(),
          db.occurrences.clear(),
        ]);
        await db.categories.bulkPut(
          payload.categories.length > 0 ? payload.categories : buildDefaultCategories(),
        );
        await db.transactions.bulkPut(payload.transactions);
        await db.budgets.bulkPut(payload.budgets);
        await db.goals.bulkPut(payload.goals);
        await db.recurring.bulkPut(payload.recurring);
        await db.settings.put({ ...payload.settings, id: "app", onboarded: true });
      },
    );
  } else {
    await db.transaction(
      "rw",
      [db.transactions, db.categories, db.budgets, db.goals, db.recurring, db.settings],
      async () => {
        await db.categories.bulkPut(
          payload.categories.length > 0 ? payload.categories : buildDefaultCategories(),
        );
        await db.transactions.bulkPut(payload.transactions);
        await db.budgets.bulkPut(payload.budgets);
        await db.goals.bulkPut(payload.goals);
        await db.recurring.bulkPut(payload.recurring);
        const current = await db.settings.get("app");
        await db.settings.put({
          ...DEFAULT_SETTINGS,
          ...(current ?? {}),
          ...payload.settings,
          id: "app",
          onboarded: true,
        });
      },
    );
  }
}

/** Parse a JSON string and validate it as a backup. */
export function parseBackupJSON(json: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new AppError("INVALID_BACKUP", { messageKey: "settings.importInvalid" });
  }
  return validateBackup(parsed);
}

/** Permanently clear all user data and reset to a fresh (default) state. */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [db.transactions, db.categories, db.budgets, db.goals, db.recurring, db.occurrences, db.settings],
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.budgets.clear(),
        db.goals.clear(),
        db.recurring.clear(),
        db.occurrences.clear(),
      ]);
      // Re-seed default categories and reset settings, keeping onboarding done.
      await db.categories.bulkPut(buildDefaultCategories());
      await db.settings.put({ ...DEFAULT_SETTINGS, id: "app", createdAt: Date.now(), updatedAt: Date.now(), onboarded: true });
    },
  );
}
