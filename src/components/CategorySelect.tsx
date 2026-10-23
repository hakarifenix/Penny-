import { useLive } from "../hooks/useLive";
import { db } from "../db/db";
import type { Category, TxType } from "../db/types";
import { getIcon } from "../lib/icons";
import { useSettings } from "../state/SettingsContext";
import { withAlpha } from "./CategoryIcon";
import type { TranslationKeys } from "../i18n";

interface CategorySelectProps {
  type: TxType;
  value?: string;
  onChange: (categoryId: string) => void;
  error?: string;
}

/**
 * Horizontal-wrapping grid of category chips. Shows translated labels for
 * built-in categories and raw names for custom ones.
 */
export function CategorySelect({ type, value, onChange, error }: CategorySelectProps) {
  const { t } = useSettings();
  const categories = useLive<Category[]>(
    () => db.categories.where("type").equals(type).toArray(),
    [type],
    [],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const active = cat.id === value;
          const Icon = getIcon(cat.icon);
          const label = cat.builtinKey ? t(cat.builtinKey as TranslationKeys) : cat.name;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-transparent text-ink"
                  : "border-line bg-surface2 text-muted hover:text-ink"
              }`}
              style={active ? { backgroundColor: withAlpha(cat.color, 0.18), borderColor: cat.color } : undefined}
            >
              <Icon size={15} style={{ color: cat.color }} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </div>
  );
}
