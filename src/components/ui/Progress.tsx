interface ProgressProps {
  /** 0..1+ ratio (values above 1 fill completely). */
  ratio: number;
  /** Color tone driven by usage state. */
  tone?: "primary" | "warn" | "danger" | "secondary";
  className?: string;
}

const TONE_CLASS: Record<NonNullable<ProgressProps["tone"]>, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  warn: "bg-warn",
  danger: "bg-danger",
};

/** Accessible progress bar. Fills according to `ratio`, clamped to 100%. */
export function Progress({ ratio, tone = "primary", className = "" }: ProgressProps) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-2.5 w-full overflow-hidden rounded-full bg-surface2 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${TONE_CLASS[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Determine the progress tone from a used-ratio and a near threshold. */
export function toneForRatio(ratio: number, nearThreshold = 0.8): NonNullable<ProgressProps["tone"]> {
  if (ratio >= 1) return "danger";
  if (ratio >= nearThreshold) return "warn";
  return "primary";
}
