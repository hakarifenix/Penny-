import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Plus, Sparkles, Trash2, ChevronRight, Wallet } from "lucide-react";
import { useSettings } from "../state/SettingsContext";
import { useLive } from "../hooks/useLive";
import { db } from "../db/db";
import type { Budget, Category, SavingsGoal, Transaction } from "../db/types";
import { computeTotals, filterTransactions } from "../services/transactions";
import { computeOverallBudgetUsage, monthKeyFromDate } from "../services/budgets";
import { computeGoalProgress } from "../services/goals";
import { addSampleData, removeSampleData } from "../services/demo";
import { resolveRange, todayISO } from "../lib/dates";
import { buildSpendSeries, categoryBreakdown, sliceShare } from "../lib/analytics";
import { Card, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Progress, toneForRatio } from "../components/ui/Progress";
import { EmptyState } from "../components/ui/EmptyState";
import { MoneyText } from "../components/MoneyText";
import { TransactionRow } from "../features/transactions/TransactionRow";
import { TransactionSheet } from "../features/transactions/TransactionSheet";
import { PeriodPicker, type PeriodState } from "../components/PeriodPicker";
import { TrendChart, CategoryDonut } from "../components/charts/Charts";
import { Logo } from "../components/Logo";
import type { TxType } from "../db/types";
import { useToast } from "../state/ToastContext";

export function Home() {
  const { t } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<PeriodState>({ preset: "thisMonth" });
  const [sheet, setSheet] = useState<{ open: boolean; type: TxType }>({ open: false, type: "expense" });
  const [busySample, setBusySample] = useState(false);

  const transactions = useLive<Transaction[]>(() => db.transactions.toArray(), [], []);
  const budgets = useLive<Budget[]>(() => db.budgets.toArray(), [], []);
  const goals = useLive<SavingsGoal[]>(() => db.goals.toArray(), [], []);
  const categories = useLive<Category[]>(() => db.categories.toArray(), [], []);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const range = useMemo(() => resolveRange(period.preset, period.custom), [period]);

  const inRange = useMemo(
    () => filterTransactions(transactions, { range }),
    [transactions, range],
  );
  const totals = useMemo(() => computeTotals(inRange), [inRange]);
  const balanceAllTime = useMemo(() => computeTotals(transactions).netMinor, [transactions]);

  const periodExpenses = useMemo(() => inRange.filter((tx) => tx.type === "expense"), [inRange]);
  const trend = useMemo(() => buildSpendSeries(inRange, range), [inRange, range]);
  const breakdown = useMemo(
    () => categoryBreakdown(periodExpenses, categoriesById),
    [periodExpenses, categoriesById],
  );
  const breakdownTotal = useMemo(
    () => breakdown.reduce((acc, s) => acc + s.valueMinor, 0),
    [breakdown],
  );

  const currentMonth = monthKeyFromDate(todayISO());
  const budgetUsage = useMemo(
    () => computeOverallBudgetUsage(budgets, transactions, currentMonth),
    [budgets, transactions, currentMonth],
  );

  const totalSaved = useMemo(() => goals.reduce((acc, g) => acc + g.savedMinor, 0), [goals]);
  const activeGoal = useMemo(() => {
    const incomplete = goals
      .filter((g) => !computeGoalProgress(g).completed)
      .sort((a, b) => computeGoalProgress(b).ratio - computeGoalProgress(a).ratio);
    return incomplete[0] ?? goals[0] ?? null;
  }, [goals]);

  const recent = useMemo(
    () => filterTransactions(transactions, { sortBy: "date", sortDir: "desc" }).slice(0, 5),
    [transactions],
  );

  const hasAnyData = transactions.length > 0;
  const hasSample = useMemo(
    () => transactions.some((tx) => (tx.tags ?? []).includes("sample")),
    [transactions],
  );

  const onSampleAdd = async () => {
    setBusySample(true);
    await addSampleData();
    setBusySample(false);
    toast.success(t("home.sample.add"));
  };
  const onSampleRemove = async () => {
    setBusySample(true);
    await removeSampleData();
    setBusySample(false);
    toast.success(t("home.sample.remove"));
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <div>
            <p className="text-xs text-muted">{t("home.greeting")}</p>
            <h1 className="text-lg font-semibold leading-tight text-ink">{t("app.name")}</h1>
          </div>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className="rounded-full border border-line bg-surface p-2 text-muted hover:text-ink"
          aria-label={t("nav.settings")}
        >
          <Wallet size={20} />
        </button>
      </header>

      <div className="mt-4">
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {!hasAnyData ? (
        <div className="mt-2">
          <EmptyState
            icon={Sparkles}
            title={t("home.empty.title")}
            body={t("home.empty.body")}
            actionLabel={t("home.empty.cta")}
            onAction={() => setSheet({ open: true, type: "expense" })}
          />
          <div className="flex flex-col items-center gap-2">
            <Button variant="outline" loading={busySample} onClick={onSampleAdd}>
              {t("home.sample.add")}
            </Button>
            <p className="text-xs text-muted">{t("home.sample.hint")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Balance */}
          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute -end-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
            <p className="text-sm text-muted">{t("home.balance")}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-ink">
              <MoneyText minor={balanceAllTime} />
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface2 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <ArrowUpRight size={14} className="text-primary" />
                  {t("home.income")}
                </div>
                <p className="mt-1 text-lg font-semibold text-primary">
                  <MoneyText minor={totals.incomeMinor} />
                </p>
              </div>
              <div className="rounded-xl bg-surface2 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <ArrowDownLeft size={14} className="text-secondary" />
                  {t("home.expenses")}
                </div>
                <p className="mt-1 text-lg font-semibold text-secondary">
                  <MoneyText minor={totals.expenseMinor} />
                </p>
              </div>
            </div>
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="secondary"
              icon={<ArrowUpRight size={18} />}
              onClick={() => setSheet({ open: true, type: "income" })}
            >
              {t("home.quickAddIncome")}
            </Button>
            <Button
              size="lg"
              icon={<Plus size={18} />}
              onClick={() => setSheet({ open: true, type: "expense" })}
            >
              {t("home.quickAddExpense")}
            </Button>
          </div>

          {/* Savings + budget usage */}
          <div className="grid grid-cols-1 gap-3">
            {activeGoal && <GoalCard goal={activeGoal} onOpen={() => navigate("/budgets")} />}
            {budgetUsage && (
              <Card>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm text-muted">{t("home.budgetUsage")}</p>
                  <span
                    className={`text-xs font-medium ${
                      budgetUsage.status === "exceeded"
                        ? "text-danger"
                        : budgetUsage.status === "near"
                          ? "text-warn"
                          : "text-primary"
                    }`}
                  >
                    {budgetUsage.status === "exceeded"
                      ? t("budget.status.exceeded")
                      : budgetUsage.status === "near"
                        ? t("budget.status.near")
                        : t("budget.status.normal")}
                  </span>
                </div>
                <Progress
                  ratio={budgetUsage.usedRatio}
                  tone={toneForRatio(budgetUsage.usedRatio)}
                  className="mt-2"
                />
                <p className="mt-2 text-sm text-ink">
                  <MoneyText minor={budgetUsage.spentMinor} />{" "}
                  <span className="text-muted">/ <MoneyText minor={budgetUsage.limitMinor} /></span>
                </p>
              </Card>
            )}
            {/* Saved total */}
            <Card>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">{t("home.savings")}</p>
                <Link to="/budgets" className="text-xs font-medium text-secondary">
                  {t("home.viewAll")}
                </Link>
              </div>
              <p className="mt-1 text-2xl font-semibold text-ink">
                <MoneyText minor={totalSaved} />
              </p>
            </Card>
          </div>

          {/* Spending trend */}
          <Card>
            <CardTitle>{t("home.spendingTrend")}</CardTitle>
            <TrendChart data={trend} ariaLabel={t("home.spendingTrend")} />
          </Card>

          {/* Expense breakdown */}
          <Card>
            <CardTitle
              action={
                <Link to="/insights" className="flex items-center gap-0.5 text-xs text-secondary">
                  {t("home.viewAll")} <ChevronRight size={14} className="rtl:rotate-180" />
                </Link>
              }
            >
              {t("home.breakdown")}
            </CardTitle>
            {breakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{t("insights.noExpenses")}</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-36 shrink-0">
                  <CategoryDonut
                    data={breakdown}
                    centerLabel={t("home.expenses")}
                    ariaLabel={t("home.breakdown")}
                  />
                </div>
                <ul className="min-w-0 flex-1 space-y-2">
                  {breakdown.slice(0, 5).map((slice) => (
                    <li key={slice.id} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
                      <span className="min-w-0 flex-1 truncate text-ink">{slice.name}</span>
                      <span className="shrink-0 text-muted">
                        {Math.round(sliceShare(slice.valueMinor, breakdownTotal) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Recent transactions */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4">
              <h3 className="text-sm font-semibold text-ink">{t("home.recent")}</h3>
              <Link to="/transactions" className="flex items-center gap-0.5 text-xs text-secondary">
                {t("home.viewAll")} <ChevronRight size={14} className="rtl:rotate-180" />
              </Link>
            </div>
            <div className="divide-y divide-line/60 px-2 pb-2">
              {recent.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted">{t("home.noTransactions")}</p>
              ) : (
                recent.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    category={categoriesById.get(tx.categoryId)}
                    onClick={() => navigate("/transactions")}
                  />
                ))
              )}
            </div>
          </Card>

          {/* Sample data controls */}
          {hasSample && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-[11px] font-medium text-warn">
                {t("home.sampleBadge")}
              </span>
              <Button variant="ghost" size="sm" loading={busySample} onClick={onSampleRemove} icon={<Trash2 size={15} />}>
                {t("home.sample.remove")}
              </Button>
            </div>
          )}
        </div>
      )}

      <TransactionSheet
        open={sheet.open}
        defaultType={sheet.type}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSaved={() => navigate(0)}
      />
    </div>
  );
}

/** Active savings-goal progress card. */
function GoalCard({ goal, onOpen }: { goal: SavingsGoal; onOpen: () => void }) {
  const { t } = useSettings();
  const progress = computeGoalProgress(goal);
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted">{t("home.goalProgress")}</p>
        <button onClick={onOpen} className="text-xs font-medium text-secondary">
          {t("home.viewAll")}
        </button>
      </div>
      <p className="mt-1 font-semibold text-ink">{goal.name}</p>
      <Progress
        ratio={progress.ratio}
        tone={progress.completed ? "secondary" : toneForRatio(progress.ratio)}
        className="mt-2"
      />
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-ink">
          <MoneyText minor={goal.savedMinor} />{" "}
          <span className="text-muted">/ <MoneyText minor={goal.targetMinor} /></span>
        </span>
        <span className="text-muted">{progress.percent}%</span>
      </div>
      {progress.completed && (
        <p className="mt-1 text-xs font-medium text-secondary">{t("goal.completed")}</p>
      )}
    </Card>
  );
}
