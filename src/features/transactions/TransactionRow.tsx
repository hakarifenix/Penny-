import { Trash2 } from "lucide-react";
import type { Category, Transaction } from "../../db/types";
import { CategoryIcon } from "../../components/CategoryIcon";
import { MoneyText } from "../../components/MoneyText";
import { useSettings } from "../../state/SettingsContext";
import type { TranslationKeys } from "../../i18n";

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  onClick?: () => void;
  /** Optional trailing delete affordance. */
  onDelete?: () => void;
}

function formatDate(dateISO: string, locale: string, time?: string): string {
  try {
    const [y, m, d] = dateISO.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const formatted = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
    return time ? `${formatted} · ${time}` : formatted;
  } catch {
    return dateISO;
  }
}

/** A single transaction list row: icon, description, meta, signed amount. */
export function TransactionRow({ transaction, category, onClick, onDelete }: TransactionRowProps) {
  const { t, locale } = useSettings();
  const isIncome = transaction.type === "income";
  const label = category?.builtinKey
    ? t(category.builtinKey as TranslationKeys)
    : category?.name ?? t("common.noCategory");

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-1 py-2.5 ${onClick ? "cursor-pointer hover:bg-surface2" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CategoryIcon category={category} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">{transaction.description}</p>
        <p className="truncate text-xs text-muted">
          {label} · {formatDate(transaction.date, locale, transaction.time)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`whitespace-nowrap text-[15px] font-semibold tabular-nums ${
            isIncome ? "text-primary" : "text-ink"
          }`}
        >
          {isIncome ? "+" : "−"}
          <MoneyText minor={transaction.amountMinor} />
        </span>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-full p-1.5 text-muted hover:text-danger"
            aria-label={t("common.delete")}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
