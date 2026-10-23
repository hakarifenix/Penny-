import { useEffect, useMemo, useState } from "react";
import { Sheet } from "../../components/ui/Sheet";
import { Field, AmountInput, TextInput, DateInput, TimeInput, TextArea } from "../../components/ui/Field";
import { Segmented } from "../../components/ui/Segmented";
import { CategorySelect } from "../../components/CategorySelect";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../state/SettingsContext";
import { useToast } from "../../state/ToastContext";
import { useLive } from "../../hooks/useLive";
import { db } from "../../db/db";
import type { Category, Transaction, TxType } from "../../db/types";
import { addTransaction, updateTransaction } from "../../services/transactions";
import { parseAmountToMinor } from "../../lib/money";
import { todayISO } from "../../lib/dates";
import { isAppError } from "../../lib/errors";

interface TransactionSheetProps {
  open: boolean;
  onClose: () => void;
  /** When present, the sheet edits this transaction. */
  transaction?: Transaction | null;
  /** Initial type for a new transaction. */
  defaultType?: TxType;
  onSaved: () => void;
}

export function TransactionSheet({
  open,
  onClose,
  transaction,
  defaultType = "expense",
  onSaved,
}: TransactionSheetProps) {
  const { t, currency } = useSettings();
  const toast = useToast();
  const isEdit = Boolean(transaction);

  const [type, setType] = useState<TxType>(transaction?.type ?? defaultType);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const categories = useLive<Category[]>(
    () => db.categories.where("type").equals(type).toArray(),
    [type],
    [],
  );

  // (Re)initialize form whenever the sheet opens or the target changes.
  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setAmount((transaction.amountMinor / 100).toString());
      setCategoryId(transaction.categoryId);
      setDescription(transaction.description);
      setDate(transaction.date);
      setTime(transaction.time ?? "");
      setNotes(transaction.notes ?? "");
      setTags((transaction.tags ?? []).join(", "));
    } else {
      setType(defaultType);
      setAmount("");
      setDescription("");
      setDate(todayISO());
      setTime("");
      setNotes("");
      setTags("");
      setCategoryId("");
    }
    setErrors({});
  }, [open, transaction, defaultType]);

  // Keep a valid category selected when the type (and list) changes.
  useEffect(() => {
    if (!open || categories.length === 0) return;
    const valid = categories.some((c) => c.id === categoryId);
    if (!valid) setCategoryId(categories[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categories]);

  const today = useMemo(() => todayISO(), []);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const minor = parseAmountToMinor(amount, currency);
    if (minor === null || minor <= 0) next.amount = t("tx.validation.amountInvalid");
    else if (minor > 100_000_000_00) next.amount = t("tx.validation.amountMax");
    if (!description.trim()) next.description = t("tx.validation.description");
    if (!date) next.date = t("tx.validation.date");
    if (!categoryId) next.categoryId = t("tx.validation.category");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const minor = parseAmountToMinor(amount, currency);
    if (minor === null) return;
    setSaving(true);
    try {
      const payload = {
        type,
        amountMinor: minor,
        categoryId,
        description: description.trim(),
        date,
        time: time || undefined,
        notes: notes.trim() || undefined,
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (transaction) {
        await updateTransaction(transaction.id, payload);
        toast.success(t("tx.saved"));
      } else {
        await addTransaction(payload);
        toast.success(t("tx.created"));
      }
      onSaved();
      onClose();
    } catch (err) {
      if (isAppError(err) && err.fields) {
        setErrors(err.fields);
      }
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? t("tx.edit") : t("tx.add")}
      footer={
        <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      }
    >
      <div className="space-y-4 pt-1">
        <Segmented<TxType>
          value={type}
          onChange={setType}
          options={[
            { value: "expense", label: t("common.expense") },
            { value: "income", label: t("common.income") },
          ]}
        />

        <Field label={t("common.amount")} error={errors.amount} required>
          <AmountInput
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus={!isEdit}
            error={errors.amount}
          />
        </Field>

        <Field label={t("common.description")} error={errors.description} required>
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("common.description")}
            error={errors.description}
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {t("common.category")}
          </span>
          <CategorySelect type={type} value={categoryId} onChange={setCategoryId} error={errors.categoryId} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.date")} error={errors.date} required>
            <DateInput value={date} max={today} onChange={(e) => setDate(e.target.value)} error={errors.date} />
          </Field>
          <Field label={t("common.time")} hint={t("common.optional")}>
            <TimeInput value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        <Field label={t("common.notes")} hint={t("common.optional")}>
          <TextArea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={t("common.notes")}
          />
        </Field>

        <Field label={t("common.tags")} hint={t("common.optional")}>
          <TextInput
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tag1, tag2"
          />
        </Field>
      </div>
    </Sheet>
  );
}
