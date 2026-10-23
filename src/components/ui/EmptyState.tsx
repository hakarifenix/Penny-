import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Extra element rendered below the CTA (e.g. a secondary link). */
  children?: ReactNode;
}

/** Friendly empty-state block used across list screens and the dashboard. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface2">
        <Icon size={28} className="text-secondary" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-ink">{title}</h3>
      {body && <p className="mb-5 max-w-xs text-sm leading-relaxed text-muted">{body}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
