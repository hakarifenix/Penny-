import { useEffect, useState } from "react";
import { Sheet } from "../../components/ui/Sheet";
import { Field, TextInput, AmountInput, DateInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../state/SettingsContext";
import { useToast } from "../../state/ToastContext";
import type { SavingsGoal } from "../../db/types";
import { addGoal, updateGoal } from "../../services/goals";
import { parseAmountToMinor } from "../../lib/money";
import { isAppError } from "../../lib/errors";

interface GoalSheetProps {
  open: boolean;
  onClose: () => void;
  goal?: SavingsGoal | null;
  onSaved: () => void;
}

/** Create or edit a savings goal. */
export function GoalSheet({ open, onClose, goal, onSaved }: GoalSheetProps) {
  const { t, currency } = useSettings();
  const toast = useToast();
  const isEdit = Boolean(goal);

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setName(goal.name);
      setTarget((goal.targetMinor / 100).toString());
      setSaved((goal.savedMinor / 100).toString());
      setTargetDate(goal.targetDate ?? "");
    } else {
      setName("");
      setTarget("");
      setSaved("");
      setTargetDate("");
    }
    setErrors({});
  }, [open, goal]);

  const handleSave = async () => {
    const next: Record<string, string> = {};
    const targetMinor = parseAmountToMinor(target, currency);
    const savedMinor = parseAmountToMinor(saved || "0", currency);
    if (!name.trim()) next.name = t("goal.validation.name");
    if (targetMinor === null || targetMinor <= 0) next.target = t("goal.validation.target");
    if (savedMinor === null || savedMinor < 0) next.saved = t("goal.validation.saved");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        targetMinor: targetMinor ?? 0,
        savedMinor: savedMinor ?? 0,
        targetDate: targetDate || undefined,
      };
      if (goal) await updateGoal(goal.id, payload);
      else await addGoal(payload);
      toast.success(t("goal.saved"));
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
      title={isEdit ? t("goal.edit") : t("goal.add")}
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
        <Field label={t("goal.target")} error={errors.target} required>
          <AmountInput value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" error={errors.target} />
        </Field>
        <Field label={isEdit ? t("goal.correctAmount") : t("goal.savedAmount")} error={errors.saved}>
          <AmountInput value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0.00" error={errors.saved} />
        </Field>
        <Field label={t("goal.targetDate")} hint={t("common.optional")}>
          <DateInput value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </Field>
        <p className="text-xs text-muted">{t("goal.note")}</p>
      </div>
    </Sheet>
  );
}
