import { Segmented } from "./ui/Segmented";
import { DateInput } from "./ui/Field";
import { useSettings } from "../state/SettingsContext";
import type { PeriodPreset, DateRange } from "../lib/dates";

export interface PeriodState {
  preset: PeriodPreset;
  custom?: DateRange;
}

interface PeriodPickerProps {
  value: PeriodState;
  onChange: (value: PeriodState) => void;
  /** Hide the "custom" option (e.g. on very compact views). */
  allowCustom?: boolean;
}

/** Compact period selector used by the dashboard and insights. */
export function PeriodPicker({ value, onChange, allowCustom = true }: PeriodPickerProps) {
  const { t } = useSettings();

  const options = [
    { value: "thisMonth" as const, label: t("home.thisMonth") },
    { value: "lastMonth" as const, label: t("home.lastMonth") },
    ...(allowCustom ? [{ value: "custom" as const, label: t("home.customRange") }] : []),
  ];

  return (
    <div className="space-y-2">
      <Segmented
        value={value.preset}
        options={options}
        onChange={(preset) => onChange({ ...value, preset })}
      />
      {value.preset === "custom" && (
        <div className="flex items-center gap-2 animate-fade-in">
          <DateInput
            value={value.custom?.from ?? ""}
            onChange={(e) =>
              onChange({ ...value, custom: { from: e.target.value, to: value.custom?.to ?? e.target.value } })
            }
            className="flex-1"
            aria-label={t("common.from")}
          />
          <span className="text-muted">–</span>
          <DateInput
            value={value.custom?.to ?? ""}
            onChange={(e) =>
              onChange({ ...value, custom: { from: value.custom?.from ?? e.target.value, to: e.target.value } })
            }
            className="flex-1"
            aria-label={t("common.to")}
          />
        </div>
      )}
    </div>
  );
}
