import { db } from "../db/db";
import type { Category, TxType } from "../db/types";
import { buildDefaultCategories } from "../db/seed";
import { newId } from "../lib/id";
import { AppError } from "../lib/errors";
import { reassignCategory } from "./transactions";

/** ID used to represent "uncategorized" when a category is deleted. */
export const UNCATEGORIZED_ID = "cat-exp-other";

/**
 * Seed the default categories if none exist. Safe to call on every startup.
 * Idempotent: only inserts when the categories table is empty.
 */
export async function ensureDefaultCategories(): Promise<void> {
  const count = await db.categories.count();
  if (count > 0) return;
  await db.categories.bulkPut(buildDefaultCategories());
}

/** Read all categories (non-reactive; prefer useLiveQuery in components). */
export async function listCategories(): Promise<Category[]> {
  return db.categories.toArray();
}

export interface CategoryInput {
  name: string;
  type: TxType;
  icon: string;
  color: string;
}

/** Create a custom category. */
export async function createCategory(input: CategoryInput): Promise<Category> {
  const name = input.name.trim();
  if (!name) throw new AppError("VALIDATION", { fields: { name: "cat.validation.name" } });
  const now = Date.now();
  const category: Category = {
    id: newId(),
    name,
    type: input.type,
    icon: input.icon,
    color: input.color,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.categories.put(category);
  return category;
}

/** Update a category (name/icon/color). Defaults keep their flag. */
export async function updateCategory(
  id: string,
  patch: Partial<CategoryInput>,
): Promise<Category> {
  const existing = await db.categories.get(id);
  if (!existing) throw new AppError("NOT_FOUND");
  const name = (patch.name ?? existing.name).trim();
  if (!name) throw new AppError("VALIDATION", { fields: { name: "cat.validation.name" } });
  const updated: Category = {
    ...existing,
    name,
    type: patch.type ?? existing.type,
    icon: patch.icon ?? existing.icon,
    color: patch.color ?? existing.color,
    updatedAt: Date.now(),
  };
  await db.categories.put(updated);
  return updated;
}

/**
 * Delete a category. Transactions that used it are reassigned to a safe
 * fallback so history is never orphaned or corrupted.
 */
export async function deleteCategory(id: string): Promise<number> {
  const existing = await db.categories.get(id);
  if (!existing) throw new AppError("NOT_FOUND");
  if (existing.isDefault) {
    // Default categories can be hidden by the user but deleting them outright
    // is not supported to keep budgets/recurring references stable. Treat as error.
    throw new AppError("IS_DEFAULT");
  }
  const fallback =
    existing.type === "income" ? "cat-inc-other" : UNCATEGORIZED_ID;
  const moved = await reassignCategory(id, fallback);
  await db.categories.delete(id);
  return moved;
}

/** Fetch a category by id. */
export async function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id);
}
