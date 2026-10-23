import { db } from "../db/db";
import type { RecurringTemplate, RecurrenceFrequency, Transaction } from "../db/types";
import { newId, occurrenceId } from "../lib/id";
import { AppError } from "../lib/errors";
import { addDaysISO, addMonthsISO, todayISO } from "../lib/dates";
import { validateAmount } from "./transactions";

export interface RecurringInput {
  name: string;
  type: Transaction["type"];
  amountMinor: number;
  categoryId: string;
  frequency: RecurrenceFrequency;
  /** Next scheduled occurrence "YYYY-MM-DD". */
  nextDate: string;
  notes?: string;
  autoPost: boolean;
  active: boolean;
}

function validateRecurringInput(input: RecurringInput): void {
  const fields: Record<string, string> = {};
  if (!input.name || input.name.trim() === "") fields.name = "recurring.validation.name";
  if (!validateAmount(input.amountMinor)) fields.amountMinor = "recurring.validation.amount";
  if (!input.categoryId) fields.categoryId = "tx.validation.category";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.nextDate)) fields.nextDate = "tx.validation.date";
  if (Object.keys(fields).length > 0) throw new AppError("VALIDATION", { fields });
}

/** Create a recurring template. */
export async function addRecurring(input: RecurringInput): Promise<RecurringTemplate> {
  validateRecurringInput(input);
  const now = Date.now();
  const template: RecurringTemplate = {
    id: newId(),
    name: input.name.trim(),
    type: input.type,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    frequency: input.frequency,
    nextDate: input.nextDate,
    notes: input.notes?.trim() || undefined,
    autoPost: input.autoPost,
    active: input.active,
    createdAt: now,
    updatedAt: now,
  };
  await db.recurring.put(template);
  return template;
}

/** Update a recurring template. */
export async function updateRecurring(
  id: string,
  patch: Partial<RecurringInput>,
): Promise<RecurringTemplate> {
  const existing = await db.recurring.get(id);
  if (!existing) throw new AppError("NOT_FOUND");
  const merged: RecurringInput = {
    name: patch.name ?? existing.name,
    type: patch.type ?? existing.type,
    amountMinor: patch.amountMinor ?? existing.amountMinor,
    categoryId: patch.categoryId ?? existing.categoryId,
    frequency: patch.frequency ?? existing.frequency,
    nextDate: patch.nextDate ?? existing.nextDate,
    notes: patch.notes ?? existing.notes,
    autoPost: patch.autoPost ?? existing.autoPost,
    active: patch.active ?? existing.active,
  };
  validateRecurringInput(merged);
  const updated: RecurringTemplate = {
    ...existing,
    name: merged.name.trim(),
    type: merged.type,
    amountMinor: merged.amountMinor,
    categoryId: merged.categoryId,
    frequency: merged.frequency,
    nextDate: merged.nextDate,
    notes: merged.notes?.trim() || undefined,
    autoPost: merged.autoPost,
    active: merged.active,
    updatedAt: Date.now(),
  };
  await db.recurring.put(updated);
  return updated;
}

/** Delete a recurring template. Already-posted transactions are untouched. */
export async function deleteRecurring(id: string): Promise<void> {
  await db.recurring.delete(id);
}

/** Compute the date after `dateISO` for one step of `frequency`. */
export function nextOccurrenceDate(
  dateISO: string,
  frequency: RecurrenceFrequency,
): string {
  switch (frequency) {
    case "daily":
      return addDaysISO(dateISO, 1);
    case "weekly":
      return addDaysISO(dateISO, 7);
    case "monthly":
      return addMonthsISO(dateISO, 1);
    case "yearly":
      return addMonthsISO(dateISO, 12);
  }
}

export interface ProcessResult {
  posted: number;
  transactionIds: string[];
}

/** Guard against pathological catch-up loops on very old templates. */
const MAX_CATCHUP = 400;

/**
 * Post every due occurrence for active templates up to `today`.
 * Duplicate prevention: an occurrence is identified by
 * `${templateId}::${date}` and only posted if that record does not already
 * exist, so re-running (app open/resume) never double-posts.
 */
export async function processDueRecurring(today: string = todayISO()): Promise<ProcessResult> {
  // Booleans aren't valid IndexedDB keys, so filter active templates in code.
  const all = (await db.recurring.toArray()).filter((t) => t.active);

  let posted = 0;
  const transactionIds: string[] = [];

  for (const template of all) {
    let cursor = template.nextDate;
    let guard = 0;
    while (cursor <= today && guard < MAX_CATCHUP) {
      guard++;
      const occId = occurrenceId(template.id, cursor);
      const already = await db.occurrences.get(occId);
      if (!already) {
        const now = Date.now();
        const tx: Transaction = {
          id: newId(),
          type: template.type,
          amountMinor: template.amountMinor,
          categoryId: template.categoryId,
          description: template.name,
          date: cursor,
          notes: template.notes,
          recurringTemplateId: template.id,
          createdAt: now,
          updatedAt: now,
        };
        await db.transactions.put(tx);
        await db.occurrences.put({
          id: occId,
          templateId: template.id,
          date: cursor,
          transactionId: tx.id,
          createdAt: now,
        });
        posted++;
        transactionIds.push(tx.id);
      }
      cursor = nextOccurrenceDate(cursor, template.frequency);
    }
    // Persist the advanced next date even if occurrences were already posted.
    if (cursor !== template.nextDate) {
      await db.recurring.update(template.id, { nextDate: cursor, updatedAt: Date.now() });
    }
  }

  return { posted, transactionIds };
}

/**
 * Manually post the template's current next occurrence immediately, then
 * advance. Still guarded against duplicates.
 */
export async function postRecurringNow(id: string): Promise<Transaction | null> {
  const template = await db.recurring.get(id);
  if (!template) throw new AppError("NOT_FOUND");
  const occId = occurrenceId(template.id, template.nextDate);
  const already = await db.occurrences.get(occId);
  let tx: Transaction | null = null;
  if (!already) {
    const now = Date.now();
    tx = {
      id: newId(),
      type: template.type,
      amountMinor: template.amountMinor,
      categoryId: template.categoryId,
      description: template.name,
      date: template.nextDate,
      notes: template.notes,
      recurringTemplateId: template.id,
      createdAt: now,
      updatedAt: now,
    };
    await db.transactions.put(tx);
    await db.occurrences.put({
      id: occId,
      templateId: template.id,
      date: template.nextDate,
      transactionId: tx.id,
      createdAt: now,
    });
  }
  const next = nextOccurrenceDate(template.nextDate, template.frequency);
  await db.recurring.update(id, { nextDate: next, updatedAt: Date.now() });
  return tx;
}

/** Whether a template is due on/before the given date. */
export function isDue(template: RecurringTemplate, today: string): boolean {
  return template.active && template.nextDate <= today;
}
