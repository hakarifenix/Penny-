import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db/db";
import {
  buildBackup,
  validateBackup,
  parseBackupJSON,
  importBackup,
} from "./backup";
import { addTransaction } from "./transactions";
import { addGoal } from "./goals";

beforeEach(async () => {
  await db.transactions.clear();
  await db.categories.clear();
  await db.goals.clear();
  await db.budgets.clear();
  await db.recurring.clear();
});

describe("buildBackup + validateBackup round trip", () => {
  it("produces a valid payload", async () => {
    await addTransaction({
      type: "expense",
      amountMinor: 1234,
      categoryId: "cat-exp-food",
      description: "Lunch",
      date: "2024-05-10",
    });
    await addGoal({ name: "Trip", targetMinor: 100000, savedMinor: 1000 });
    const payload = await buildBackup();
    expect(payload.app).toBe("pennytrack");
    expect(payload.transactions).toHaveLength(1);

    // validateBackup should accept it unchanged.
    const validated = validateBackup(JSON.parse(JSON.stringify(payload)));
    expect(validated.transactions).toHaveLength(1);
    expect(validated.goals).toHaveLength(1);
  });
});

describe("validateBackup rejects malformed data", () => {
  it("rejects non-object / wrong app", () => {
    expect(() => validateBackup(null)).toThrow();
    expect(() => validateBackup("nope")).toThrow();
    expect(() => validateBackup({ app: "other" })).toThrow();
  });

  it("rejects a transaction with a bad amount", () => {
    const bad = {
      app: "pennytrack",
      version: 1,
      transactions: [
        { id: "t", type: "expense", amountMinor: -5, categoryId: "c", description: "x", date: "2024-05-01" },
      ],
    };
    expect(() => validateBackup(bad)).toThrow();
  });

  it("rejects a transaction with a malformed date", () => {
    const bad = {
      app: "pennytrack",
      version: 1,
      transactions: [
        { id: "t", type: "expense", amountMinor: 100, categoryId: "c", description: "x", date: "not-a-date" },
      ],
    };
    expect(() => validateBackup(bad)).toThrow();
  });

  it("rejects when transactions is not an array", () => {
    expect(() => validateBackup({ app: "pennytrack", version: 1, transactions: "nope" })).toThrow();
  });
});

describe("parseBackupJSON", () => {
  it("throws AppError on invalid JSON", () => {
    expect(() => parseBackupJSON("{ not json")).toThrow();
  });

  it("throws AppError with the import message key on bad shape", () => {
    try {
      parseBackupJSON(JSON.stringify({ app: "wrong", version: 1, transactions: [] }));
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as { code?: string }).code).toBe("INVALID_BACKUP");
    }
  });
});

describe("importBackup", () => {
  it("replace mode restores transactions and clears old data", async () => {
    // Seed existing data that should be wiped.
    await addTransaction({
      type: "expense",
      amountMinor: 999,
      categoryId: "cat-exp-food",
      description: "old",
      date: "2024-01-01",
    });

    const backup = {
      app: "pennytrack" as const,
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: { id: "app" as const, currency: "EUR", language: "fr", theme: "light", onboarded: true, pinEnabled: false, lockOnResume: true, createdAt: 0, updatedAt: 0 },
      categories: [],
      transactions: [
        { id: "n1", type: "income" as const, amountMinor: 5000, categoryId: "cat-inc-salary", description: "restored", date: "2024-06-01", createdAt: 0, updatedAt: 0 },
      ],
      budgets: [],
      goals: [],
      recurring: [],
    };

    const validated = validateBackup(backup);
    await importBackup(validated, "replace");

    const all = await db.transactions.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].description).toBe("restored");
    // Default categories re-seeded since backup had none.
    expect((await db.categories.count())).toBeGreaterThan(0);
    // Currency restored.
    expect((await db.settings.get("app"))?.currency).toBe("EUR");
  });

  it("merge mode keeps existing records not present in backup", async () => {
    const existing = await addTransaction({
      type: "expense",
      amountMinor: 111,
      categoryId: "cat-exp-food",
      description: "keep-me",
      date: "2024-02-02",
    });

    const backup = {
      app: "pennytrack" as const,
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: { id: "app" as const, currency: "USD", language: "en", theme: "dark", onboarded: true, pinEnabled: false, lockOnResume: true, createdAt: 0, updatedAt: 0 },
      categories: [],
      transactions: [
        { id: "n2", type: "income" as const, amountMinor: 42, categoryId: "cat-inc-salary", description: "added", date: "2024-03-03", createdAt: 0, updatedAt: 0 },
      ],
      budgets: [],
      goals: [],
      recurring: [],
    };

    await importBackup(validateBackup(backup), "merge");
    const all = await db.transactions.toArray();
    expect(all).toHaveLength(2);
    expect(all.some((t) => t.id === existing.id)).toBe(true);
    expect(all.some((t) => t.description === "added")).toBe(true);
  });

  it("does not modify the database when validation fails first", async () => {
    await addTransaction({
      type: "expense",
      amountMinor: 777,
      categoryId: "cat-exp-food",
      description: "safe",
      date: "2024-04-04",
    });
    expect(() => parseBackupJSON('{"app":"pennytrack","version":1,"transactions":[{"id":"x","type":"expense","amountMinor":-1,"categoryId":"c","description":"d","date":"2024-05-01"}]}')).toThrow();
    // Existing data untouched.
    expect(await db.transactions.count()).toBe(1);
  });
});
