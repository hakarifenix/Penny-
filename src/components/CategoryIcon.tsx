import { getIcon } from "../lib/icons";
import type { Category } from "../db/types";

interface CategoryIconProps {
  category?: Category;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: { box: "h-8 w-8", icon: 15 },
  md: { box: "h-10 w-10", icon: 18 },
  lg: { box: "h-12 w-12", icon: 22 },
} as const;

/** A rounded, tinted badge showing a category's icon in its color. */
export function CategoryIcon({ category, size = "md", className = "" }: CategoryIconProps) {
  const Icon = getIcon(category?.icon ?? "shapes");
  const color = category?.color ?? "#64748B";
  const s = SIZE[size];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl ${s.box} ${className}`}
      style={{ backgroundColor: withAlpha(color, 0.16), color }}
    >
      <Icon size={s.icon} />
    </span>
  );
}

/** Append an 8-hex-digit alpha to a #rrggbb color. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${clean}${a}`;
}
