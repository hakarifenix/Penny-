/**
 * Money is stored and computed in integer minor units (e.g. centimes for MAD,
 * cents for USD/EUR/GBP). This avoids floating point drift for arithmetic.
 * All supported currencies use 2 decimal places.
 */

export type CurrencyCode = "MAD" | "USD" | "EUR" | "GBP";

export interface CurrencyMeta {
  code: CurrencyCode;
  /** Number of decimal (fraction) digits used by this currency. */
  decimals: number;
  /** Symbol used only as a last-resort fallback if Intl is unavailable. */
  fallbackSymbol: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  MAD: { code: "MAD", decimals: 2, fallbackSymbol: "د.م." },
  USD: { code: "USD", decimals: 2, fallbackSymbol: "$" },
  EUR: { code: "EUR", decimals: 2, fallbackSymbol: "€" },
  GBP: { code: "GBP", decimals: 2, fallbackSymbol: "£" },
};

export const CURRENCY_CODES: CurrencyCode[] = ["MAD", "USD", "EUR", "GBP"];

/** Multiplier to convert major units -> minor units for a currency. */
function scaleFactor(decimals: number): number {
  return Math.pow(10, decimals);
}

/**
 * Round a float to the nearest integer, correcting binary representation
 * error (e.g. 1.005 * 100 === 100.49999999999999 -> 100 rather than 101).
 */
function roundClean(n: number): number {
  return Math.round(Number(n.toPrecision(12)));
}

/**
 * Convert a major-unit number (or numeric string) into integer minor units.
 * Returns null when the value is not a finite number.
 */
export function toMinor(
  major: number | string,
  currency: CurrencyCode = "MAD",
): number | null {
  const decimals = CURRENCIES[currency].decimals;
  const value = typeof major === "string" ? Number(major.trim()) : major;
  if (!Number.isFinite(value)) return null;
  return roundClean(value * scaleFactor(decimals));
}

/**
 * Parse a user-typed amount string into integer minor units.
 * Accepts "12", "12.5", "12,50", "1 234,56". Returns null when invalid.
 */
export function parseAmountToMinor(
  input: string,
  currency: CurrencyCode = "MAD",
): number | null {
  if (typeof input !== "string") return null;
  let cleaned = input.trim().replace(/\s|\u00a0/g, "");
  if (cleaned === "") return null;
  // Normalize decimal comma to dot when there is no dot already.
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(/,/g, ".");
  } else {
    cleaned = cleaned.replace(/,/g, "");
  }
  if (!/^-?\d*\.?\d*$/.test(cleaned) || cleaned === "." || cleaned === "-") {
    return null;
  }
  const major = Number(cleaned);
  if (!Number.isFinite(major)) return null;
  return toMinor(major, currency);
}

/** Convert integer minor units back into a major-unit number. */
export function toMajor(minor: number, currency: CurrencyCode = "MAD"): number {
  const decimals = CURRENCIES[currency].decimals;
  return minor / scaleFactor(decimals);
}

/** Add two minor-unit amounts (returns a plain number). */
export function addMinor(a: number, b: number): number {
  return a + b;
}

/** Subtract minor-unit amounts: a - b. */
export function subMinor(a: number, b: number): number {
  return a - b;
}

/** Sum an array of minor-unit amounts. */
export function sumMinor(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Clamp a minor-unit amount to a non-negative value. */
export function clampNonNegative(value: number): number {
  return value < 0 ? 0 : value;
}

export interface FormatMoneyOptions {
  currency?: CurrencyCode;
  /** BCP-47 locale, e.g. "en", "fr", "ar-MA". */
  locale?: string;
  /** Force the sign to be shown (useful for +/- deltas). */
  signDisplay?: "auto" | "always" | "never";
  /** When true, drop the fractional digits if they are zero. */
  compactFraction?: boolean;
}

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: CurrencyCode, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${currency}|${JSON.stringify(opts)}`;
  let f = formatters.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, opts);
    } catch {
      f = new Intl.NumberFormat("en", opts);
    }
    formatters.set(key, f);
  }
  return f;
}

/**
 * Format integer minor units as a localized currency string.
 * Never throws — falls back to a plain numeric string if Intl fails.
 */
export function formatMoney(
  minor: number,
  options: FormatMoneyOptions = {},
): string {
  const currency = options.currency ?? "MAD";
  const locale = options.locale ?? "en";
  const decimals = CURRENCIES[currency].decimals;
  const major = toMajor(minor, currency);

  const opts: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: options.compactFraction && minor % 100 === 0 ? 0 : decimals,
    maximumFractionDigits: options.compactFraction && minor % 100 === 0 ? 0 : decimals,
  };
  if (options.signDisplay) opts.signDisplay = options.signDisplay;

  try {
    return getFormatter(locale, currency, opts).format(major);
  } catch {
    const symbol = CURRENCIES[currency].fallbackSymbol;
    const fixed = major.toFixed(decimals);
    const negative = minor < 0 ? "-" : "";
    return `${negative}${symbol}${fixed}`;
  }
}

/** Format a plain (non-currency) number with locale grouping. */
export function formatNumber(value: number, locale = "en", maximumFractionDigits = 1): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Format a percentage (0-100) safely. Returns "0%" style string.
 */
export function formatPercent(fraction: number, locale = "en"): string {
  const safe = Number.isFinite(fraction) ? fraction : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(safe);
  } catch {
    return `${Math.round(safe * 100)}%`;
  }
}
