import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Target, HandCoins } from "lucide-react";
import { useSettings } from "../state/SettingsContext";
import { useLive } from "../hooks/useLive";
import { useToast } from "../state/ToastContext";
import { db } from "../db/db";
import type { Budget, Category, SavingsGoal } from "../db/types";
import {
  computeAllBudgets,
  deleteBudget,
  type BudgetStatus,
} from "../services/budgets";
import { computeGoalProgress, deleteGoal } from "../services/goals";
import { TopBar } from "../components/layout/TopBar";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Segmented } from "../components/ui/Segmented";
import { Progress, toneForRatio } from "../components/ui/Progress";
import { EmptyState } from "../components/ui/EmptyState";
import { MoneyText } from "../components/MoneyText";
import { CategoryIcon } from "../components/CategoryIcon";
import { ConfirmDialog } from "../components/ui/Dialog";
import { BudgetSheet } from "../features/budgets/BudgetSheet";
import { GoalSheet } from "../features/goals/GoalSheet";
import { ContributeSheet } from "../features/goals/ContributeSheet";
import type { TranslationKeys } from "../i18n";

type Tab = "budgets" | "goals";

const STATUS_TONE: Record<BudgetStatus, ReturnType<typeof toneForRatio>> = {
  normal: "primary",
  near: "warn",
  exceeded: "danger",
};

export function Budgets() {
  const { t } = useSettings();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("budgets");
  const budgets = useLive<Budget[]>(() => db.budgets.toArray(), [], []);
  const goals = useLive<SavingsGoal[]>(() => db.goals.toArray(), [], []);
  const transactions = useLive(() => db.transactions.toArray(), [], []);
  const categories = useLive<Category[]>(() => db.categories.toArray(), [], []);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const [budgetSheet, setBudgetSheet] = useState<{ open: boolean; budget: Budget | null }>({ open: false, budget: null });
  const [goalSheet, setGoalSheet] = useState<{ open: boolean; goal: SavingsGoal | null }>({ open: false, goal: null });
  const [contribute, setContribute] = useState<SavingsGoal | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "budget" | "goal"; item: Budget | SavingsGoal } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const budgetRows = useMemo(
    () =>
      computeAllBudgets(budgets, transactions).sort((a, b) =>
        a.budget.month === b.budget.month
          ? a.budget.name.localeCompare(b.budget.name)
          : b.budget.month.localeCompare(a.budget.month),
      ),
    [budgets, transactions],
  );

  const catName = (c?: Category) =>
    c ? (c.builtinKey ? t(c.builtinKey as TranslationKeys) : c.name) : t("budget.allCategories");

  const onConfirmDelete = async () => {
    if (!confirm) return;
    setConfirming(true);
    if (confirm.kind === "budget") await deleteBudget(confirm.item.id);
    else await deleteGoal(confirm.item.id);
    setConfirming(false);
    setConfirm(null);
    toast.success(confirm.kind === "budget" ? t("budget.deleted") : t("goal.deleted"));
  };

  return (
    <div className="animate-fade-in">
      <TopBar
        title={t(tab === "budgets" ? "budget.title" : "goal.title")}
        action={
          <button
            onClick={() =>
              tab === "budgets"
                ? setBudgetSheet({ open: true, budget: null })
                : setGoalSheet({ open: true, goal: null })
            }
            className="rounded-full bg-primary p-2 text-[#052015]"
            aria-label={t(tab === "budgets" ? "budget.add" : "goal.add")}
          >
            <Plus size={22} />
          </button>
        }
      />

      <div className="mb-4">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "budgets", label: t("budget.title") },
            { value: "goals", label: t("goal.title") },
          ]}
        />
      </div>

      {tab === "budgets" ? (
        budgetRows.length === 0 ? (
          <EmptyState
            icon={Target}
            title={t("budget.empty.title")}
            body={t("budget.empty.body")}
            actionLabel={t("budget.empty.cta")}
            onAction={() => setBudgetSheet({ open: true, budget: null })}
          />
        ) : (
          <div className="space-y-3">
            {budgetRows.map(({ budget, progress }) => {
              const cat = budget.categoryId ? categoriesById.get(budget.categoryId) : undefined;
              return (
                <Card key={budget.id}>
                  <div className="flex items-start gap-3">
                    {budget.categoryId ? (
                      <CategoryIcon category={cat} size="md" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                        <Target size={18} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-ink">{budget.name}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            progress.status === "exceeded"
                              ? "bg-danger/15 text-danger"
                              : progress.status === "near"
                                ? "bg-warn/15 text-warn"
                                : "bg-primary/15 text-primary"
                          }`}
                        >
                          {t(`budget.status.${progress.status}` as TranslationKeys)}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {budget.categoryId ? catName(cat) : t("budget.allCategories")} · {budget.month}
                      </p>
                      <Progress ratio={progress.usedRatio} tone={STATUS_TONE[progress.status]} className="mt-2" />
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-muted">
                          <MoneyText minor={progress.spentMinor} className="text-ink" /> / <MoneyText minor={budget.limitMinor} />
                        </span>
                        <span className={progress.remainingMinor < 0 ? "text-danger" : "text-muted"}>
                          {progress.remainingMinor < 0
                            ? `${t("budget.over")} `
                            : ""}
                          <MoneyText minor={Math.abs(progress.remainingMinor)} />
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => setBudgetSheet({ open: true, budget })}>
                          {t("common.edit")}
                        </Button>
                        <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setConfirm({ kind: "budget", item: budget })}>
                          {t("common.delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t("goal.empty.title")}
          body={t("goal.empty.body")}
          actionLabel={t("goal.empty.cta")}
          onAction={() => setGoalSheet({ open: true, goal: null })}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = computeGoalProgress(goal);
            return (
              <Card key={goal.id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Target size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{goal.name}</p>
                      <p className="text-xs text-muted">
                        {progress.completed ? t("goal.completed") : `${progress.percent}%`}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-ink">
                    <MoneyText minor={goal.savedMinor} />
                  </span>
                </div>
                <Progress
                  ratio={progress.ratio}
                  tone={progress.completed ? "secondary" : toneForRatio(progress.ratio)}
                  className="mt-3"
                />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted">
                    <MoneyText minor={goal.savedMinor} className="text-ink" /> / <MoneyText minor={goal.targetMinor} />
                  </span>
                  <span className="text-muted">
                    {t("goal.remaining")}: <MoneyText minor={progress.remainingMinor} />
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={<HandCoins size={14} />} onClick={() => setContribute(goal)} disabled={progress.completed}>
                    {t("goal.contribute")}
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => setGoalSheet({ open: true, goal })}>
                    {t("common.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setConfirm({ kind: "goal", item: goal })}>
                    {t("common.delete")}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetSheet
        open={budgetSheet.open}
        budget={budgetSheet.budget}
        onClose={() => setBudgetSheet({ open: false, budget: null })}
        onSaved={() => {}}
      />
      <GoalSheet
        open={goalSheet.open}
        goal={goalSheet.goal}
        onClose={() => setGoalSheet({ open: false, goal: null })}
        onSaved={() => {}}
      />
      <ContributeSheet
        open={Boolean(contribute)}
        goal={contribute}
        onClose={() => setContribute(null)}
        onSaved={() => {}}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === "goal" ? t("goal.deleteConfirm.title") : t("budget.deleteConfirm.title")}
        body={
          confirm
            ? confirm.kind === "goal"
              ? t("goal.deleteConfirm.body", { name: (confirm.item as SavingsGoal).name })
              : t("budget.deleteConfirm.body", { name: (confirm.item as Budget).name })
            : ""
        }
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={confirming}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
