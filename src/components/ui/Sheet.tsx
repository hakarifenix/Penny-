import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Optional footer pinned below the scrollable content. */
  footer?: ReactNode;
}

/**
 * A mobile-friendly bottom sheet. Slides up from the bottom, has a draggable
 * look, a backdrop that closes on tap, and respects the safe-area inset.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  // Lock body scroll and handle Escape while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg animate-slide-up flex-col rounded-t-3xl border-t border-line bg-surface shadow-pop">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-line absolute left-1/2 top-2 -translate-x-1/2" />
          {title ? (
            <h2 className="text-base font-semibold text-ink">{title}</h2>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-surface2 hover:text-ink"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer ? (
          <div className="border-t border-line px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
            {footer}
          </div>
        ) : (
          <div className="h-[max(env(safe-area-inset-bottom),0.75rem)]" />
        )}
      </div>
    </div>,
    document.body,
  );
}
