import { useState } from "react";
import { Lock, Delete } from "lucide-react";
import { useLock } from "../state/LockContext";
import { useSettings } from "../state/SettingsContext";
import { Logo } from "./Logo";

/** Full-screen PIN entry shown whenever the app is locked. */
export function LockScreen() {
  const { unlock, lockoutSeconds } = useLock();
  const { t } = useSettings();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const lockedOut = lockoutSeconds > 0;

  const submit = async (value: string) => {
    if (lockedOut) return;
    const ok = await unlock(value);
    if (!ok) {
      setError(true);
      setPin("");
    }
  };

  const onKey = (digit: string) => {
    if (lockedOut) return;
    setError(false);
    const next = (pin + digit).slice(0, 6);
    setPin(next);
    if (next.length >= 4) {
      // Auto-submit once it reaches the minimum length; longer PINs submit on
      // the keypad's check button.
      void submit(next);
    }
  };

  const onBackspace = () => {
    setError(false);
    setPin((p) => p.slice(0, -1));
  };

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-base px-8">
      <Logo size={56} className="mb-6" />
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Lock size={22} />
      </div>
      <h1 className="mt-3 text-lg font-semibold text-ink">{t("lock.title")}</h1>
      <p className="mt-1 text-sm text-muted">
        {lockedOut ? t("lock.failedAttempts", { seconds: lockoutSeconds }) : t("lock.enter")}
      </p>

      {/* PIN dots */}
      <div className="mt-7 flex items-center gap-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border transition-colors ${
              i < pin.length
                ? "border-primary bg-primary"
                : error
                  ? "border-danger/70"
                  : "border-line"
            }`}
          />
        ))}
      </div>
      {error && !lockedOut && <p className="mt-3 text-sm text-danger">{t("lock.wrong")}</p>}

      {/* Keypad */}
      <div className="mt-8 grid w-full max-w-xs grid-cols-3 gap-3">
        {keypad.map((d) => (
          <button
            key={d}
            onClick={() => onKey(d)}
            disabled={lockedOut}
            className="flex h-14 items-center justify-center rounded-2xl border border-line bg-surface text-xl font-semibold text-ink active:scale-95 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <span />
        <button
          onClick={() => onKey("0")}
          disabled={lockedOut}
          className="flex h-14 items-center justify-center rounded-2xl border border-line bg-surface text-xl font-semibold text-ink active:scale-95 disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={onBackspace}
          disabled={lockedOut}
          className="flex h-14 items-center justify-center rounded-2xl text-muted active:scale-95 disabled:opacity-50"
          aria-label="Delete"
        >
          <Delete size={22} className="rtl:rotate-180" />
        </button>
      </div>

      {pin.length >= 4 && (
        <button
          onClick={() => submit(pin)}
          disabled={lockedOut}
          className="mt-6 text-sm font-medium text-secondary disabled:opacity-50"
        >
          {t("lock.unlock")}
        </button>
      )}
    </div>
  );
}
