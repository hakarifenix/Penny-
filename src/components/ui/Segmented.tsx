import type { ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional short label for narrow screens. */
  ariaLabel?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * A pill-style segmented control. Used for income/expense toggle, period
 * selector, sort options, theme selection, etc.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      className={`inline-flex w-full items-center gap-1 rounded-xl border border-line bg-surface2 p-1 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            aria-label={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-[#052015] shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
