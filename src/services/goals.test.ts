import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db/db";
import {
  addGoal,
  contributeToGoal,
  computeGoalProgress,
  totalSaved,
  updateGoal,
} from "./goals";
import type { SavingsGoal } from "../db/types";

function goal(partial: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: "g1",
    name: "Trip",
    targetMinor: partial.targetMinor ?? 100000,
    savedMinor: partial.savedMinor ?? 25000,
    createdAt: 0,
    updatedAt: 0,
  };
}

beforeEach(async () => {
  await db.goals.clear();
});

describe("computeGoalProgress", () => {
  it("computes ratio, remaining and percent", () => {
    const p = computeGoalProgress(goal({ targetMinor: 100000, savedMinor: 25000 }));
    expect(p.ratio).toBeCloseTo(0.25);
    expect(p.remainingMinor).toBe(75000);
    expect(p.percent).toBe(25);
    expect(p.completed).toBe(false);
  });

  it("detects completion and clamps percent to 100", () => {
    const p = computeGoalProgress(goal({ targetMinor: 100000, savedMinor: 150000 }));
    expect(p.completed).toBe(true);
    expect(p.percent).toBe(100);
    expect(p.remainingMinor).toBe(0);
  });

  it("is safe for zero target", () => {
    const p = computeGoalProgress(goal({ targetMinor: 0, savedMinor: 0 }));
    expect(p.ratio).toBe(0);
    expect(p.completed).toBe(false);
  });
});

describe("addGoal / contributeToGoal", () => {
  it("rejects invalid target", async () => {
    await expect(addGoal({ name: "x", targetMinor: 0, savedMinor: 0 })).rejects.toThrow();
  });

  it("adds a contribution to savedMinor", async () => {
    const created = await addGoal({ name: "Trip", targetMinor: 100000, savedMinor: 10000 });
    await contributeToGoal(created.id, 5000);
    const updated = await db.goals.get(created.id);
    expect(updated?.savedMinor).toBe(15000);
  });

  it("rejects a negative contribution", async () => {
    const created = await addGoal({ name: "Trip", targetMinor: 100000, savedMinor: 0 });
    await expect(contributeToGoal(created.id, -100)).rejects.toThrow();
  });

  it("updates the saved amount directly", async () => {
    const created = await addGoal({ name: "Trip", targetMinor: 100000, savedMinor: 0 });
    await updateGoal(created.id, { savedMinor: 42000 });
    expect((await db.goals.get(created.id))?.savedMinor).toBe(42000);
  });
});

describe("totalSaved", () => {
  it("sums saved across goals", () => {
    expect(totalSaved([goal({ savedMinor: 100 }), goal({ savedMinor: 250 })])).toBe(350);
  });
});
