import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  loading?: boolean;
  /** Optional confirm guard: when provided, requires this text to be typed. */
  confirmText?: string;
  confirmTextInput?: string;
  onConfirmTextChange?: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A destructive-action confirmation modal with an optional "type to confirm"
 * guard for the most dangerous operations (e.g. clearing all data).
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = true,
  loading = false,
  confirmText,
  confirmTextInput = "",
  onConfirmTextChange,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  const guardActive = Boolean(confirmText);
  const guardPassed = !guardActive || confirmTextInput.trim() === confirmText;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm animate-scale-in rounded-2xl border border-line bg-surface p-5 shadow-pop">
        <div className="mb-3 flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger ? "bg-danger/15 text-danger" : "bg-secondary/15 text-secondary"
            }`}
          >
            <AlertTriangle size={20} />
          </span>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
        </div>
        <div className="text-sm leading-relaxed text-muted">{body}</div>

        {guardActive && (
          <input
            value={confirmTextInput}
            onChange={(e) => onConfirmTextChange?.(e.target.value)}
            placeholder={confirmText}
            autoCapitalize="characters"
            className="mt-4 w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-danger/60"
          />
        )}

        <div className="mt-5 flex gap-3">
          <Button variant="outline" fullWidth onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            fullWidth
            onClick={onConfirm}
            loading={loading}
            disabled={!guardPassed}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
