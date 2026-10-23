import { db } from "../db/db";
import type { SavingsGoal } from "../db/types";
import { newId } from "../lib/id";
import { AppError } from "../lib/errors";
import { validateAmount } from "./transactions";

export interface GoalInput {
  name: string;
  /** Positive integer minor units. */
  targetMinor: number;
  /** Current saved amount (>= 0). */
  savedMinor: number;
  targetDate?: string;
}

function validateGoalInput(input: GoalInput): void {
  const fields: Record<string, string> = {};
  if (!input.name || input.name.trim() === "") fields.name = "goal.validation.name";
  if (!validateAmount(input.targetMinor)) fields.targetMinor = "goal.validation.target";
  if (!Number.isInteger(input.savedMinor) || input.savedMinor < 0) {
    fields.savedMinor = "goal.validation.saved";
  }
  if (Object.keys(fields).length > 0) throw new AppError("VALIDATION", { fields });
}

/** Create a savings goal. */
export async function addGoal(input: GoalInput): Promise<SavingsGoal> {
  validateGoalInput(input);
  const now = Date.now();
  const goal: SavingsGoal = {
    id: newId(),
    name: input.name.trim(),
    targetMinor: input.targetMinor,
    savedMinor: input.savedMinor,
    targetDate: input.targetDate,
    createdAt: now,
    updatedAt: now,
  };
  await db.goals.put(goal);
  return goal;
}

/** Update a goal's fields. */
export async function updateGoal(id: string, patch: Partial<GoalInput>): Promise<SavingsGoal> {
  const existing = await db.goals.get(id);
  if (!existing) throw new AppError("NOT_FOUND");
  const merged: GoalInput = {
    name: patch.name ?? existing.name,
    targetMinor: patch.targetMinor ?? existing.targetMinor,
    savedMinor: patch.savedMinor ?? existing.savedMinor,
    targetDate: patch.targetDate !== undefined ? patch.targetDate : existing.targetDate,
  };
  validateGoalInput(merged);
  const updated: SavingsGoal = {
    ...existing,
    name: merged.name.trim(),
    targetMinor: merged.targetMinor,
    savedMinor: merged.savedMinor,
    targetDate: merged.targetDate,
    updatedAt: Date.now(),
  };
  await db.goals.put(updated);
  return updated;
}

/**
 * Add a contribution to a goal (increases savedMinor).
 * Contributions are intentionally NOT recorded as expenses, to avoid
 * double-counting money the user still has (just earmarked).
 */
export async function contributeToGoal(id: string, amountMinor: number): Promise<SavingsGoal> {
  if (!validateAmount(amountMinor)) {
    throw new AppError("VALIDATION", { fields: { amount: "goal.validation.contribution" } });
  }
  const existing = await db.goals.get(id);
  if (!existing) throw new AppError("NOT_FOUND");
  const updated: SavingsGoal = {
    ...existing,
    savedMinor: existing.savedMinor + amountMinor,
    updatedAt: Date.now(),
  };
  await db.goals.put(updated);
  return updated;
}

/** Delete a goal. */
export async function deleteGoal(id: string): Promise<void> {
  await db.goals.delete(id);
}

export interface GoalProgress {
  /** 0..1+ (can exceed 1 when over target). */
  ratio: number;
  remainingMinor: number;
  completed: boolean;
  percent: number;
}

/** Compute progress for a goal. Safe for zero/negative edge cases. */
export function computeGoalProgress(goal: SavingsGoal): GoalProgress {
  const target = goal.targetMinor;
  const saved = goal.savedMinor;
  const ratio = target > 0 ? saved / target : 0;
  const remainingMinor = Math.max(0, target - saved);
  const completed = target > 0 && saved >= target;
  const percent = Math.min(100, Math.round(ratio * 100));
  return { ratio, remainingMinor, completed, percent };
}

/** Total amount saved across all goals (for the dashboard). */
export function totalSaved(goals: SavingsGoal[]): number {
  return goals.reduce((acc, g) => acc + g.savedMinor, 0);
}
