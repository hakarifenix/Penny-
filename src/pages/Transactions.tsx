import { useMemo, useState, type ReactNode } from "react";
import { Plus, SlidersHorizontal, Search, Trash2, Pencil, Tag, StickyNote, Calendar } from "lucide-react";
import { useSettings } from "../state/SettingsContext";
import { useLive } from "../hooks/useLive";
import { useToast } from "../state/ToastContext";
import { db } from "../db/db";
import type { Category, Transaction, TxType } from "../db/types";
import { filterTransactions, computeTotals, deleteTransaction } from "../services/transactions";
import { TopBar } from "../components/layout/TopBar";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Sheet } from "../components/ui/Sheet";
import { Field, Select, DateInput } from "../components/ui/Field";
import { Segmented } from "../components/ui/Segmented";
import { EmptyState } from "../components/ui/EmptyState";
import { MoneyText } from "../components/MoneyText";
import { CategoryIcon } from "../components/CategoryIcon";
import { ConfirmDialog } from "../components/ui/Dialog";
import { TransactionRow } from "../features/transactions/TransactionRow";
import { TransactionSheet } from "../features/transactions/TransactionSheet";
import type { SortDir, SortField } from "../services/transactions";
import type { TranslationKeys } from "../i18n";

const PAGE_SIZE = 30;

type TypeFilter = TxType | "all";

export function Transactions() {
  const { t } = useSettings();
  const toast = useToast();

  const transactions = useLive<Transaction[]>(() => db.transactions.toArray(), [], []);
  const categories = useLive<Category[]>(() => db.categories.toArray(), [], []);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [page, setPage] = useState(1);

  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const resolvedRange =
    range.from && range.to
      ? { from: range.from <= range.to ? range.from : range.to, to: range.from <= range.to ? range.to : range.from }
      : undefined;

  const filtered = useMemo(
    () =>
      filterTransactions(transactions, {
        search,
        type,
        categoryId,
        range: resolvedRange,
        sortBy,
        sortDir,
      }),
    [transactions, search, type, categoryId, resolvedRange, sortBy, sortDir],
  );

  const totals = useMemo(() => computeTotals(filtered), [filtered]);
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > visible.length;

  const filtersActive =
    search.trim() !== "" || type !== "all" || categoryId !== "all" || Boolean(resolvedRange);

  const clearFilters = () => {
    setSearch("");
    setType("all");
    setCategoryId("all");
    setRange({});
    setPage(1);
  };

  const catName = (c?: Category) =>
    c ? (c.builtinKey ? t(c.builtinKey as TranslationKeys) : c.name) : t("common.noCategory");

  const onDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await deleteTransaction(confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
    setDetail(null);
    toast.success(t("tx.deleted"));
  };

  return (
    <div className="animate-fade-in">
      <TopBar
        title={t("tx.title")}
        action={
          <button
            onClick={() => {
              setDetail(null);
              setEditing(null);
              setAddOpen(true);
            }}
            className="rounded-full bg-primary p-2 text-[#052015]"
            aria-label={t("tx.add")}
          >
            <Plus size={22} />
          </button>
        }
      />

      {/* Search */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("tx.searchPlaceholder")}
            className="w-full rounded-xl border border-line bg-surface2 ps-10 pe-3 py-2.5 text-sm text-ink placeholder:text-muted/70 outline-none focus:border-primary/60"
          />
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className={`relative rounded-xl border px-3 ${filtersActive ? "border-primary/50 bg-primary/10 text-primary" : "border-line bg-surface2 text-muted"}`}
          aria-label={t("common.filter")}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Summary of filtered set */}
      {filtered.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-xs text-muted">
          <span>{t("tx.showingCount", { shown: visible.length, total: filtered.length })}</span>
          <span>
            <span className="text-primary">+<MoneyText minor={totals.incomeMinor} /></span>
            {"  "}
            <span className="text-secondary">−<MoneyText minor={totals.expenseMinor} /></span>
          </span>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={filtersActive ? t("tx.empty.filtered") : t("tx.empty.title")}
          body={filtersActive ? undefined : t("tx.empty.body")}
          actionLabel={filtersActive ? t("tx.clearFilters") : undefined}
          onAction={filtersActive ? clearFilters : undefined}
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="divide-y divide-line/60 px-2">
            {visible.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                category={categoriesById.get(tx.categoryId)}
                onClick={() => setDetail(tx)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="px-4 pb-4 pt-2">
              <Button variant="outline" fullWidth onClick={() => setPage((p) => p + 1)}>
                {t("tx.loadMore")}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Filters sheet */}
      <Sheet open={showFilters} onClose={() => setShowFilters(false)} title={t("common.filter")}>
        <div className="space-y-4 pt-1">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">{t("tx.filterType")}</span>
            <Segmented<TypeFilter>
              value={type}
              onChange={(v) => {
                setType(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: t("common.all") },
                { value: "expense", label: t("common.expense") },
                { value: "income", label: t("common.income") },
              ]}
            />
          </div>

          <Field label={t("tx.filterCategory")}>
            <Select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">{t("common.all")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {catName(c)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("common.from")}>
              <DateInput value={range.from ?? ""} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
            </Field>
            <Field label={t("common.to")}>
              <DateInput value={range.to ?? ""} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
            </Field>
          </div>

          <Field label={t("tx.sortBy")}>
            <Select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split("-");
                setSortBy(field as SortField);
                setSortDir(dir as SortDir);
                setPage(1);
              }}
            >
              <option value="date-desc">{t("tx.sortDateDesc")}</option>
              <option value="date-asc">{t("tx.sortDateAsc")}</option>
              <option value="amount-desc">{t("tx.sortAmountDesc")}</option>
              <option value="amount-asc">{t("tx.sortAmountAsc")}</option>
            </Select>
          </Field>

          <div className="flex gap-3 pb-2">
            <Button variant="outline" fullWidth onClick={clearFilters}>
              {t("tx.clearFilters")}
            </Button>
            <Button fullWidth onClick={() => setShowFilters(false)}>
              {t("common.apply")}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Detail sheet */}
      <Sheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={t("tx.details")}
        footer={
          detail && (
            <div className="flex gap-3">
              <Button
                variant="danger"
                fullWidth
                icon={<Trash2 size={16} />}
                onClick={() => setConfirmDelete(detail)}
              >
                {t("common.delete")}
              </Button>
              <Button
                fullWidth
                icon={<Pencil size={16} />}
                onClick={() => {
                  setEditing(detail);
                  setDetail(null);
                }}
              >
                {t("common.edit")}
              </Button>
            </div>
          )
        }
      >
        {detail && (
          <div className="pt-1">
            <div className="flex items-center gap-3">
              <CategoryIcon category={categoriesById.get(detail.categoryId)} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-ink">{detail.description}</p>
                <p className="text-sm text-muted">{catName(categoriesById.get(detail.categoryId))}</p>
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold text-ink">
              <span className={detail.type === "income" ? "text-primary" : "text-secondary"}>
                {detail.type === "income" ? "+" : "−"}
                <MoneyText minor={detail.amountMinor} />
              </span>
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <Row icon={<Calendar size={15} />} label={t("common.date")} value={`${detail.date}${detail.time ? ` · ${detail.time}` : ""}`} />
              {detail.notes && <Row icon={<StickyNote size={15} />} label={t("common.notes")} value={detail.notes} />}
              {detail.tags && detail.tags.length > 0 && (
                <Row icon={<Tag size={15} />} label={t("common.tags")} value={detail.tags.join(", ")} />
              )}
            </dl>
          </div>
        )}
      </Sheet>

      {/* Add sheet */}
      <TransactionSheet
        open={addOpen}
        defaultType="expense"
        onClose={() => setAddOpen(false)}
        onSaved={() => {}}
      />

      {/* Edit sheet */}
      <TransactionSheet
        open={Boolean(editing)}
        transaction={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setDetail(null);
        }}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={t("tx.deleteConfirm.title")}
        body={t("tx.deleteConfirm.body", { name: confirmDelete?.description ?? "" })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={deleting}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// Small presentational row for the detail sheet.
function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="flex items-center gap-1.5 text-muted">{icon}{label}</dt>
      <dd className="ms-auto text-end text-ink">{value}</dd>
    </div>
  );
}
