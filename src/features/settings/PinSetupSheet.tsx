import { useEffect, useState } from "react";
import { Sheet } from "../../components/ui/Sheet";
import { Field, TextInput } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../state/SettingsContext";
import { useToast } from "../../state/ToastContext";
import { generatePinSalt, hashPin, isValidPinFormat } from "../../lib/pin";

interface PinSetupSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Create or change the 4–6 digit PIN (stored only as a salted hash). */
export function PinSetupSheet({ open, onClose }: PinSetupSheetProps) {
  const { t, update } = useSettings();
  const toast = useToast();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setConfirm("");
      setError(undefined);
    }
  }, [open]);

  const handleSave = async () => {
    if (!isValidPinFormat(pin)) {
      setError(t("settings.pinInvalid"));
      return;
    }
    if (pin !== confirm) {
      setError(t("settings.pinMismatch"));
      return;
    }
    setSaving(true);
    try {
      const salt = generatePinSalt();
      const hash = await hashPin(pin, salt);
      await update({
        pinEnabled: true,
        pinSalt: salt,
        pinHash: hash,
        lockOnResume: true,
      });
      toast.success(t("settings.pinEnabled"));
      onClose();
    } catch {
      // Web Crypto unavailable — never silently claim success.
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("settings.pinChange")}
      footer={
        <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
          {t("common.save")}
        </Button>
      }
    >
      <div className="space-y-4 pt-1">
        <Field label={t("settings.pinNew")} error={error} required>
          <TextInput
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            error={error}
            autoFocus
          />
        </Field>
        <Field label={t("settings.pinConfirm")} required>
          <TextInput
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <p className="text-xs text-muted">{t("settings.pinNote")}</p>
      </div>
    </Sheet>
  );
}
