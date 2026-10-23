import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

/** Elevated surface card used across all screens. */
export function Card({ children, padded = true, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface shadow-card ${padded ? "p-4" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  action?: ReactNode;
}

/** Section title inside a card with an optional trailing action. */
export function CardTitle({ children, action }: CardTitleProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-ink">{children}</h3>
      {action}
    </div>
  );
}
