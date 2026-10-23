import { useMemo, useState, type ReactNode } from "react";
import { Download, TrendingUp, TrendingDown, Wallet, Percent } from "lucide-react";
import { useSettings } from "../state/SettingsContext";
import { useLive } from "../hooks/useLive";
import { useToast } from "../state/ToastContext";
import { db } from "../db/db";
import type { Budget, Category, Transaction } from "../db/types";
import { computeTotals, filterTransactions } from "../services/transactions";
import { computeAllBudgets, monthKeyFromDate } from "../services/budgets";
import {
  buildSpendSeries,
  categoryBreakdown,
  comparePeriods,
  averageDailySpend,
  savingsRate,
  previousRange,
  sliceShare,
  topCategories,
} from "../lib/analytics";
import { resolveRange, daysBetween, todayISO } from "../lib/dates";
import { formatPercent, formatNumber } from "../lib/money";
import { transactionsToCSV } from "../services/csv";
import { saveTextFile, timestampedFilename } from "../lib/download";
import { TopBar } from "../components/layout/TopBar";
import { Card, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Progress, toneForRatio } from "../components/ui/Progress";
import { EmptyState } from "../components/ui/EmptyState";
import { MoneyText } from "../components/MoneyText";
import { CategoryIcon } from "../components/CategoryIcon";
import { PeriodPicker, type PeriodState } from "../components/PeriodPicker";
import { TrendChart, CategoryDonut, CompareBars } from "../components/charts/Charts";

export function Insights() {
  const { t, locale, currency } = useSettings();
  const toast = useToast();

  const [period, setPeriod] = useState<PeriodState>({ preset: "thisMonth" });

  const transactions = useLive<Transaction[]>(() => db.transactions.toArray(), [], []);
  const budgets = useLive<Budget[]>(() => db.budgets.toArray(), [], []);
  const categories = useLive<Category[]>(() => db.categories.toArray(), [], []);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const range = useMemo(() => resolveRange(period.preset, period.custom), [period]);
  const inRange = useMemo(() => filterTransactions(transactions, { range }), [transactions, range]);
  const prev = useMemo(() => previousRange(range), [range]);
  const prevRange = useMemo(() => filterTransactions(transactions, { range: prev }), [transactions, prev]);

  const totals = useMemo(() => computeTotals(inRange), [inRange]);
  const prevTotals = useMemo(() => computeTotals(prevRange), [prevRange]);

  const expenses = useMemo(() => inRange.filter((tx) => tx.type === "expense"), [inRange]);
  const trend = useMemo(() => buildSpendSeries(inRange, range), [inRange, range]);
  const breakdown = useMemo(() => categoryBreakdown(expenses, categoriesById), [expenses, categoriesById]);
  const breakdownTotal = useMemo(() => breakdown.reduce((a, s) => a + s.valueMinor, 0), [breakdown]);

  const days = daysBetween(range.from, range.to);
  const avgDaily = useMemo(() => averageDailySpend(totals.expenseMinor, days), [totals.expenseMinor, days]);
  const rate = savingsRate(totals.incomeMinor, totals.expenseMinor);

  const expenseCompare = comparePeriods(totals.expenseMinor, prevTotals.expenseMinor);
  const incomeCompare = comparePeriods(totals.incomeMinor, prevTotals.incomeMinor);

  const currentMonth = monthKeyFromDate(todayISO());
  const budgetRows = useMemo(
    () => computeAllBudgets(budgets.filter((b) => b.month === currentMonth), transactions),
    [budgets, transactions, currentMonth],
  );

  const hasData = inRange.length > 0;

  const onExportCSV = async () => {
    try {
      const csv = transactionsToCSV(transactions, categoriesById, currency);
      await saveTextFile(timestampedFilename("pennytrack-transactions", "csv"), "text/csv", csv);
      toast.success(t("settings.exported"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <div className="animate-fade-in">
      <TopBar
        title={t("insights.title")}
        action={
          <button
            onClick={onExportCSV}
            className="rounded-full border border-line bg-surface p-2 text-muted hover:text-ink"
            aria-label={t("settings.exportCsv")}
          >
            <Download size={20} />
          </button>
        }
      />

      <div className="mb-4">
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {!hasData ? (
        <EmptyState icon={TrendingUp} title={t("insights.empty.title")} body={t("insights.empty.body")} />
      ) : (
        <div className="space-y-4">
          {/* Income vs expenses + comparison */}
          <Card>
            <CardTitle>{t("insights.incomeVsExpense")}</CardTitle>
            <CompareBars
              data={[
                { label: t("insights.title"), incomeMinor: totals.incomeMinor, expenseMinor: totals.expenseMinor },
                { label: t("insights.prevPeriod"), incomeMinor: prevTotals.incomeMinor, expenseMinor: prevTotals.expenseMinor },
              ]}
              ariaLabel={t("insights.incomeVsExpense")}
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <CompareStat
                label={t("home.income")}
                value={incomeCompare.deltaMinor}
                ratio={incomeCompare.deltaRatio}
                direction={incomeCompare.direction}
                vsPrevLabel={t("insights.vsPrev")}
                locale={locale}
              />
              <CompareStat
                label={t("home.expenses")}
                value={-expenseCompare.deltaMinor}
                ratio={expenseCompare.deltaRatio === null ? null : -expenseCompare.deltaRatio}
                direction={expenseCompare.direction}
                invert
                vsPrevLabel={t("insights.vsPrev")}
                locale={locale}
              />
            </div>
          </Card>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={<Wallet size={18} />} label={t("insights.avgDaily")} color="secondary">
              <MoneyText minor={avgDaily} />
            </MetricCard>
            <MetricCard icon={<Percent size={18} />} label={t("insights.savingsRate")} color="primary">
              {rate === null ? t("insights.noIncome") : formatPercent(rate, locale)}
            </MetricCard>
          </div>

          {/* Daily trend */}
          <Card>
            <CardTitle>{t("insights.trend")}</CardTitle>
            <TrendChart data={trend} ariaLabel={t("insights.trend")} />
          </Card>

          {/* Category breakdown */}
          <Card>
            <CardTitle>{t("insights.byCategory")}</CardTitle>
            {breakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{t("insights.noExpenses")}</p>
            ) : (
              <>
                <CategoryDonut data={breakdown} centerLabel={t("home.expenses")} ariaLabel={t("insights.byCategory")} />
                <ul className="mt-4 space-y-3">
                  {breakdown.map((slice) => (
                    <li key={slice.id} className="flex items-center gap-3">
                      <CategoryIcon category={categoriesById.get(slice.id)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate text-ink">{slice.name}</span>
                          <span className="text-muted">
                            {Math.round(sliceShare(slice.valueMinor, breakdownTotal) * 100)}%
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          <MoneyText minor={slice.valueMinor} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {/* Top categories */}
          <Card>
            <CardTitle>{t("insights.topCategories")}</CardTitle>
            {topCategories(breakdown, 3).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">{t("insights.noExpenses")}</p>
            ) : (
              <ol className="space-y-2">
                {topCategories(breakdown, 3).map((slice, i) => (
                  <li key={slice.id} className="flex items-center gap-3 rounded-xl bg-surface2 px-3 py-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs font-semibold text-muted">
                      {i + 1}
                    </span>
                    <CategoryIcon category={categoriesById.get(slice.id)} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{slice.name}</span>
                    <span className="text-sm font-medium text-ink">
                      <MoneyText minor={slice.valueMinor} />
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Budget performance */}
          <Card>
            <CardTitle>{t("insights.budgetPerf")}</CardTitle>
            {budgetRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">{t("budget.empty.title")}</p>
            ) : (
              <ul className="space-y-4">
                {budgetRows.map(({ budget, progress }) => (
                  <li key={budget.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate text-ink">{budget.name}</span>
                      <span
                        className={
                          progress.status === "exceeded"
                            ? "text-danger"
                            : progress.status === "near"
                              ? "text-warn"
                              : "text-primary"
                        }
                      >
                        {Math.round(progress.usedRatio * 100)}%
                      </span>
                    </div>
                    <Progress ratio={progress.usedRatio} tone={toneForRatio(progress.usedRatio)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Button variant="outline" fullWidth icon={<Download size={16} />} onClick={onExportCSV}>
            {t("settings.exportCsv")}
          </Button>
          <p className="pb-2 text-center text-xs text-muted">{formatNumber(days, locale, 0)} {t("common.day").toLowerCase()}</p>
        </div>
      )}
    </div>
  );
}

function CompareStat({
  label,
  value,
  ratio,
  direction,
  invert = false,
  vsPrevLabel,
  locale,
}: {
  label: string;
  value: number;
  ratio: number | null;
  direction: "up" | "down" | "flat";
  invert?: boolean;
  vsPrevLabel: string;
  locale: string;
}) {
  const positive = invert ? value < 0 : value > 0;
  const tone = direction === "flat" ? "text-muted" : positive ? "text-primary" : "text-danger";
  const Icon = direction === "down" ? TrendingDown : TrendingUp;
  return (
    <div className="rounded-xl bg-surface2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-center gap-1">
        <Icon size={14} className={tone} />
        <span className={`text-sm font-semibold ${tone}`}>
          <MoneyText minor={Math.abs(value)} signDisplay="always" />
        </span>
      </div>
      {ratio !== null && (
        <p className="mt-0.5 text-[11px] text-muted">
          {formatPercent(Math.abs(ratio), locale)} {vsPrevLabel}
        </p>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  color,
  children,
}: {
  icon: ReactNode;
  label: string;
  color: "primary" | "secondary";
  children: ReactNode;
}) {
  return (
    <Card>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color === "primary" ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary"}`}>
        {icon}
      </div>
      <p className="mt-2 text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-ink">{children}</p>
    </Card>
  );
}
