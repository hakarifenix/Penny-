import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Play, Info } from "lucide-react";
import { Sheet } from "../../components/ui/Sheet";
import { Field, TextInput, AmountInput, DateInput, Select, TextArea } from "../../components/ui/Field";
import { Segmented } from "../../components/ui/Segmented";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../state/SettingsContext";
import { useToast } from "../../state/ToastContext";
import { useLive } from "../../hooks/useLive";
import { db } from "../../db/db";
import type { Category, RecurringTemplate, RecurrenceFrequency, TxType } from "../../db/types";
import {
  addRecurring,
  updateRecurring,
  deleteRecurring,
  postRecurringNow,
} from "../../services/recurring";
import { parseAmountToMinor } from "../../lib/money";
import { todayISO } from "../../lib/dates";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { CategoryIcon } from "../../components/CategoryIcon";
import { MoneyText } from "../../components/MoneyText";
import { isAppError } from "../../lib/errors";
import type { TranslationKeys } from "../../i18n";

interface RecurringManagerProps {
  open: boolean;
  onClose: () => void;
}

const FREQS: RecurrenceFrequency[] = ["daily", "weekly", "monthly", "yearly"];

export function RecurringManager({ open, onClose }: RecurringManagerProps) {
  const { t, currency } = useSettings();
  const toast = useToast();
  const templates = useLive<RecurringTemplate[]>(() => db.recurring.toArray(), [open], []);
  const categories = useLive<Category[]>(() => db.categories.toArray(), [], []);
  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTemplate | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [nextDate, setNextDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [autoPost, setAutoPost] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<RecurringTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Keep a valid category for the selected type.
  useEffect(() => {
    const ofType = categories.filter((c) => c.type === type);
    if (ofType.length > 0 && !ofType.some((c) => c.id === categoryId)) {
      setCategoryId(ofType[0].id);
    }
  }, [type, categories, categoryId]);

  const openAdd = () => {
    setEditing(null);
    setType("expense");
    setName("");
    setAmount("");
    setFrequency("monthly");
    setNextDate(todayISO());
    setNotes("");
    setAutoPost(true);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (tpl: RecurringTemplate) => {
    setEditing(tpl);
    setType(tpl.type);
    setName(tpl.name);
    setAmount((tpl.amountMinor / 100).toString());
    setCategoryId(tpl.categoryId);
    setFrequency(tpl.frequency);
    setNextDate(tpl.nextDate);
    setNotes(tpl.notes ?? "");
    setAutoPost(tpl.autoPost);
    setErrors({});
    setFormOpen(true);
  };

  const onSave = async () => {
    const next: Record<string, string> = {};
    const minor = parseAmountToMinor(amount, currency);
    if (!name.trim()) next.name = t("recurring.validation.name");
    if (minor === null || minor <= 0) next.amount = t("recurring.validation.amount");
    if (!nextDate) next.nextDate = t("tx.validation.date");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        amountMinor: minor ?? 0,
        categoryId,
        frequency,
        nextDate,
        notes: notes.trim() || undefined,
        autoPost,
        active: editing ? editing.active : true,
      };
      if (editing) await updateRecurring(editing.id, payload);
      else await addRecurring(payload);
      toast.success(t("recurring.saved"));
      setFormOpen(false);
    } catch (err) {
      if (isAppError(err) && err.fields) setErrors(err.fields);
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (tpl: RecurringTemplate) => {
    await updateRecurring(tpl.id, { active: !tpl.active });
  };

  const onPostNow = async (tpl: RecurringTemplate) => {
    const tx = await postRecurringNow(tpl.id);
    toast.success(tx ? t("recurring.posted") : t("recurring.explain"));
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await deleteRecurring(confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
    toast.success(t("recurring.deleted"));
  };

  return (
    <>
      <Sheet open={open && !formOpen} onClose={onClose} title={t("recurring.title")}>
        <div className="pt-1">
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-secondary/25 bg-secondary/10 p-3 text-xs text-muted">
            <Info size={15} className="mt-0.5 shrink-0 text-secondary" />
            <span>{t("recurring.explain")}</span>
          </div>

          <Button fullWidth icon={<Plus size={16} />} onClick={openAdd} className="mb-4">
            {t("recurring.add")}
          </Button>

          {templates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{t("recurring.empty.body")}</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((tpl) => {
                const cat = categoriesById.get(tpl.categoryId);
                return (
                  <li key={tpl.id} className="rounded-xl border border-line bg-surface2 p-3">
                    <div className="flex items-center gap-3">
                      <CategoryIcon category={cat} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{tpl.name}</p>
                        <p className="truncate text-xs text-muted">
                          <MoneyText minor={tpl.amountMinor} /> · {t(`recurring.freq.${tpl.frequency}` as TranslationKeys)} · {t("recurring.nextDate")} {tpl.nextDate}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${tpl.active ? "bg-primary/15 text-primary" : "bg-surface text-muted"}`}
                      >
                        {tpl.active ? t("recurring.active") : t("recurring.inactive")}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" icon={<Play size={14} />} onClick={() => onPostNow(tpl)}>
                        {t("recurring.postNow")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onToggleActive(tpl)}>
                        {tpl.active ? t("recurring.inactive") : t("recurring.active")}
                      </Button>
                      <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => openEdit(tpl)}>
                        {t("common.edit")}
                      </Button>
                      <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setConfirmDelete(tpl)}>
                        {t("common.delete")}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Sheet>

      {/* Add/edit form */}
      <Sheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t("recurring.edit") : t("recurring.add")}
        footer={
          <Button fullWidth size="lg" loading={saving} onClick={onSave}>
            {t("common.save")}
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
          <Field label={t("common.name")} error={errors.name} required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          </Field>
          <Field label={t("common.amount")} error={errors.amount} required>
            <AmountInput value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" error={errors.amount} />
          </Field>
          <Field label={t("common.category")}>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.builtinKey ? t(c.builtinKey as TranslationKeys) : c.name}
                  </option>
                ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("recurring.frequency")}>
              <Select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}>
                {FREQS.map((f) => (
                  <option key={f} value={f}>
                    {t(`recurring.freq.${f}` as TranslationKeys)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("recurring.nextDate")} error={errors.nextDate}>
              <DateInput value={nextDate} onChange={(e) => setNextDate(e.target.value)} error={errors.nextDate} />
            </Field>
          </div>
          <Field label={t("common.notes")} hint={t("common.optional")}>
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
          <label className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-3 py-3">
            <span className="text-sm text-ink">{t("recurring.autoPost")}</span>
            <input type="checkbox" checked={autoPost} onChange={(e) => setAutoPost(e.target.checked)} className="h-5 w-5 accent-[#35D39A]" />
          </label>
        </div>
      </Sheet>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={t("recurring.deleteConfirm.title")}
        body={t("recurring.deleteConfirm.body", { name: confirmDelete?.name ?? "" })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={deleting}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
