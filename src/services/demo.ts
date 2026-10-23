import { db } from "../db/db";
import {
  buildSampleTransactions,
  buildSampleTransactionRows,
} from "../db/seed";
import type { Transaction } from "../db/types";

/** Tag applied to every generated sample transaction so it can be removed. */
export const SAMPLE_TAG = "sample";

/**
 * Insert a small set of clearly-labeled demo transactions so first-time users
 * can preview charts. All are tagged "sample" and can be removed atomically.
 */
export async function addSampleData(): Promise<number> {
  const seeds = buildSampleTransactions();
  const rows = buildSampleTransactionRows(seeds);
  const tagged: Transaction[] = rows.map((r) => ({
    ...r,
    tags: [...(r.tags ?? []), SAMPLE_TAG],
  }));
  await db.transactions.bulkPut(tagged);
  return tagged.length;
}

/** Remove every transaction tagged as sample data. Returns count removed. */
export async function removeSampleData(): Promise<number> {
  const all = await db.transactions.toArray();
  const sampleIds = all
    .filter((t) => (t.tags ?? []).includes(SAMPLE_TAG))
    .map((t) => t.id);
  await db.transactions.bulkDelete(sampleIds);
  return sampleIds.length;
}

/** Whether any sample data currently exists. */
export async function hasSampleData(): Promise<boolean> {
  const all = await db.transactions.toArray();
  return all.some((t) => (t.tags ?? []).includes(SAMPLE_TAG));
}
