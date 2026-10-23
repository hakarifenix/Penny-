import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db/db";
import {
  addRecurring,
  processDueRecurring,
  postRecurringNow,
  nextOccurrenceDate,
  isDue,
} from "./recurring";
import { occurrenceId } from "../lib/id";
import type { RecurringTemplate } from "../db/types";

beforeEach(async () => {
  await db.transactions.clear();
  await db.recurring.clear();
  await db.occurrences.clear();
});

function tpl(partial: Partial<RecurringTemplate> = {}): Parameters<typeof addRecurring>[0] {
  return {
    name: partial.name ?? "Salary",
    type: partial.type ?? "income",
    amountMinor: partial.amountMinor ?? 650000,
    categoryId: partial.categoryId ?? "cat-inc-salary",
    frequency: partial.frequency ?? "monthly",
    nextDate: partial.nextDate ?? "2024-05-01",
    autoPost: partial.autoPost ?? true,
    active: partial.active ?? true,
  };
}

describe("occurrenceId", () => {
  it("is deterministic for the same template + date", () => {
    expect(occurrenceId("t1", "2024-05-01")).toBe(occurrenceId("t1", "2024-05-01"));
    expect(occurrenceId("t1", "2024-05-01")).not.toBe(occurrenceId("t1", "2024-06-01"));
  });
});

describe("nextOccurrenceDate", () => {
  it("advances by frequency", () => {
    expect(nextOccurrenceDate("2024-05-01", "daily")).toBe("2024-05-02");
    expect(nextOccurrenceDate("2024-05-01", "weekly")).toBe("2024-05-08");
    expect(nextOccurrenceDate("2024-05-01", "monthly")).toBe("2024-06-01");
    expect(nextOccurrenceDate("2024-05-01", "yearly")).toBe("2025-05-01");
  });
});

describe("isDue", () => {
  it("is due when nextDate <= today and active", () => {
    const t = { ...tpl(), id: "x", createdAt: 0, updatedAt: 0 } as RecurringTemplate;
    expect(isDue(t, "2024-05-01")).toBe(true);
    expect(isDue({ ...t, active: false }, "2024-05-01")).toBe(false);
    expect(isDue(t, "2024-04-30")).toBe(false);
  });
});

describe("processDueRecurring", () => {
  it("posts one transaction per due occurrence", async () => {
    await addRecurring(tpl({ frequency: "monthly", nextDate: "2024-05-01" }));
    const result = await processDueRecurring("2024-07-15");
    // May, June, July => 3 occurrences.
    expect(result.posted).toBe(3);
    expect(await db.transactions.count()).toBe(3);
  });

  it("is idempotent — re-running does not duplicate", async () => {
    await addRecurring(tpl({ nextDate: "2024-05-01" }));
    await processDueRecurring("2024-05-10");
    const first = await db.transactions.count();
    // Run again for the same window.
    const again = await processDueRecurring("2024-05-10");
    expect(again.posted).toBe(0);
    expect(await db.transactions.count()).toBe(first);
  });

  it("does not post paused templates", async () => {
    await addRecurring(tpl({ nextDate: "2024-05-01", active: false }));
    const result = await processDueRecurring("2024-05-10");
    expect(result.posted).toBe(0);
  });

  it("advances nextDate beyond today", async () => {
    const created = await addRecurring(tpl({ nextDate: "2024-05-01" }));
    await processDueRecurring("2024-05-10");
    const updated = await db.recurring.get(created.id);
    expect((updated?.nextDate ?? "") > "2024-05-10").toBe(true);
  });

  it("posts nothing when nothing is due yet", async () => {
    await addRecurring(tpl({ nextDate: "2024-06-01" }));
    const result = await processDueRecurring("2024-05-10");
    expect(result.posted).toBe(0);
  });
});

describe("postRecurringNow", () => {
  it("posts the current next occurrence and advances", async () => {
    const created = await addRecurring(tpl({ nextDate: "2024-05-01" }));
    const tx = await postRecurringNow(created.id);
    expect(tx?.date).toBe("2024-05-01");
    expect((await db.recurring.get(created.id))?.nextDate).toBe("2024-06-01");
  });

  it("does not double-post the same occurrence", async () => {
    const created = await addRecurring(tpl({ nextDate: "2024-05-01" }));
    const first = await postRecurringNow(created.id);
    expect(first?.date).toBe("2024-05-01");
    const countAfterFirst = await db.transactions.count();

    // Force a collision by resetting nextDate back to the already-posted date.
    await db.recurring.update(created.id, { nextDate: "2024-05-01" });
    const second = await postRecurringNow(created.id);

    // The occurrence guard prevents a duplicate transaction.
    expect(second).toBeNull();
    expect(await db.transactions.count()).toBe(countAfterFirst);
  });
});
