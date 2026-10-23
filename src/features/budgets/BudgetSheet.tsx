import { useEffect, useState } from "react";
import { Sheet } from "../../components/ui/Sheet";
import { Field, TextInput, AmountInput, DateInput, Select } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../state/SettingsContext";
import { useToast } from "../../state/ToastContext";
import { useLive } from "../../hooks/useLive";
import { db } from "../../db/db";
import type { Budget, Category } from "../../db/types";
import { addBudget, updateBudget, monthKeyFromDate } from "../../services/budgets";
import { parseAmountToMinor } from "../../lib/money";
import { todayISO, startOfMonthISO } from "../../lib/dates";
import { isAppError } from "../../lib/errors";
import type { TranslationKeys } from "../../i18n";

interface BudgetSheetProps {
  open: boolean;
  onClose: () => void;
  budget?: Budget | null;
  onSaved: () => void;
}

const ALL = "__all__";

export function BudgetSheet({ open, onClose, budget, onSaved }: BudgetSheetProps) {
  const { t, currency } = useSettings();
  const toast = useToast();
  const isEdit = Boolean(budget);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [limit, setLimit] = useState("");
  const [month, setMonth] = useState(monthKeyFromDate(todayISO()));
  const [startDate, setStartDate] = useState(startOfMonthISO(todayISO()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const expenseCategories = useLive<Category[]>(
    () => db.categories.where("type").equals("expense").toArray(),
    [],
    [],
  );

  useEffect(() => {
    if (!open) return;
    if (budget) {
      setName(budget.name);
      setCategoryId(budget.categoryId ?? ALL);
      setLimit((budget.limitMinor / 100).toString());
      setMonth(budget.month);
      setStartDate(budget.startDate ?? "");
    } else {
      setName("");
      setCategoryId(ALL);
      setLimit("");
      setMonth(monthKeyFromDate(todayISO()));
      setStartDate(startOfMonthISO(todayISO()));
    }
    setErrors({});
  }, [open, budget]);

  const handleSave = async () => {
    const next: Record<string, string> = {};
    const minor = parseAmountToMinor(limit, currency);
    if (!name.trim()) next.name = t("budget.validation.name");
    if (minor === null || minor <= 0) next.limit = t("budget.validation.limit");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        categoryId: categoryId === ALL ? undefined : categoryId,
        limitMinor: minor ?? 0,
        month,
        startDate: startDate || undefined,
      };
      if (budget) await updateBudget(budget.id, payload);
      else await addBudget(payload);
      toast.success(t("budget.saved"));
      onSaved();
      onClose();
    } catch (err) {
      if (isAppError(err) && err.fields) setErrors(err.fields);
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? t("budget.edit") : t("budget.add")}
      footer={
        <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      }
    >
      <div className="space-y-4 pt-1">
        <Field label={t("common.name")} error={errors.name} required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder={t("common.name")} />
        </Field>

        <Field label={t("common.category")}>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value={ALL}>{t("budget.allCategories")}</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.builtinKey ? t(c.builtinKey as TranslationKeys) : c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("budget.limit")} error={errors.limit} required>
          <AmountInput value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0.00" error={errors.limit} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.month")}>
            <TextInput type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          <Field label={t("common.date")} hint={t("common.optional")}>
            <DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
