import { formatMoney, type FormatMoneyOptions } from "../lib/money";
import { useSettings } from "../state/SettingsContext";

interface MoneyTextProps {
  /** Amount in integer minor units. */
  minor: number;
  /** Override the active currency. */
  currency?: FormatMoneyOptions["currency"];
  signDisplay?: FormatMoneyOptions["signDisplay"];
  compactFraction?: boolean;
  className?: string;
}

/**
 * Renders a localized currency amount using the active currency + locale from
 * settings. Amounts are always passed as integer minor units.
 */
export function MoneyText({
  minor,
  currency,
  signDisplay,
  compactFraction,
  className,
}: MoneyTextProps) {
  const { currency: active, locale } = useSettings();
  const text = formatMoney(minor, {
    currency: currency ?? active,
    locale,
    signDisplay,
    compactFraction,
  });
  return <span className={className}>{text}</span>;
}
