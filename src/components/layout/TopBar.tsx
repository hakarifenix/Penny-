import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface TopBarProps {
  title: string;
  /** Show a back button (uses router navigation). */
  showBack?: boolean;
  /** Override the back handler (e.g. close a modal instead). */
  onBack?: () => void;
  action?: ReactNode;
  subtitle?: string;
}

/** Consistent top app bar for internal screens. */
export function TopBar({ title, showBack, onBack, action, subtitle }: TopBarProps) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-3 border-b border-line/60 bg-base/90 px-4 pb-3 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-md">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={() => (onBack ? onBack() : navigate(-1))}
            className="-ms-2 rounded-full p-2 text-muted hover:bg-surface2 hover:text-ink"
            aria-label="Back"
          >
            <ChevronLeft size={24} className="rtl:rotate-180" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-ink">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
