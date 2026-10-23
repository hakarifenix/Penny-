import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Icon rendered before the label. */
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "bg-primary text-[#052015] font-semibold hover:brightness-105 active:brightness-95 disabled:bg-primary/50",
  secondary:
    "bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25",
  ghost: "bg-transparent text-muted hover:bg-surface2 hover:text-ink",
  outline: "bg-surface text-ink border border-line hover:bg-surface2",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-sm rounded-xl gap-2",
  lg: "h-13 px-5 text-base rounded-xl gap-2 min-h-[52px]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
