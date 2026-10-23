import { useEffect, useState } from "react";
import { Sheet } from "../../components/ui/Sheet";
import { Field, AmountInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../state/SettingsContext";
import { useToast } from "../../state/ToastContext";
import type { SavingsGoal } from "../../db/types";
import { contributeToGoal } from "../../services/goals";
import { parseAmountToMinor } from "../../lib/money";
import { MoneyText } from "../../components/MoneyText";
import { isAppError } from "../../lib/errors";

interface ContributeSheetProps {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  onSaved: () => void;
}

/** Quickly add a contribution toward a goal (not counted as an expense). */
export function ContributeSheet({ open, onClose, goal, onSaved }: ContributeSheetProps) {
  const { t, currency } = useSettings();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setError(undefined);
    }
  }, [open]);

  const handleSave = async () => {
    if (!goal) return;
    const minor = parseAmountToMinor(amount, currency);
    if (minor === null || minor <= 0) {
      setError(t("goal.validation.contribution"));
      return;
    }
    setSaving(true);
    try {
      await contributeToGoal(goal.id, minor);
      toast.success(t("goal.contributionAdded"));
      onSaved();
      onClose();
    } catch (err) {
      if (isAppError(err) && err.fields) setError(err.fields.amount);
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? `${t("goal.contribute")} — ${goal.name}` : t("goal.contribute")}
      footer={
        <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
          {t("common.save")}
        </Button>
      }
    >
      <div className="space-y-4 pt-1">
        {goal && (
          <p className="text-sm text-muted">
            {t("goal.savedAmount")}: <MoneyText minor={goal.savedMinor} className="text-ink" /> /{" "}
            <MoneyText minor={goal.targetMinor} />
          </p>
        )}
        <Field label={t("goal.contributeAmount")} error={error} required>
          <AmountInput
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            error={error}
          />
        </Field>
        <p className="text-xs text-muted">{t("goal.note")}</p>
      </div>
    </Sheet>
  );
}
