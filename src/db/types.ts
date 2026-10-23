import type { CurrencyCode } from "../lib/money";
import type { ISODate } from "../lib/dates";

export type TxType = "income" | "expense";
export type Language = "en" | "fr" | "ar";
export type ThemeMode = "dark" | "light" | "system";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface Category {
  id: string;
  /** User-visible label. For defaults this is also shown translated via builtinKey. */
  name: string;
  type: TxType;
  /** Icon key resolved by the icon registry (see src/lib/icons.ts). */
  icon: string;
  /** Hex color used in charts and chips. */
  color: string;
  /** True for the built-in starter categories. */
  isDefault: boolean;
  /** i18n key for built-in categories (e.g. "cat.food"); ignored for custom. */
  builtinKey?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  type: TxType;
  /** Always a positive integer in minor units. Sign is implied by `type`. */
  amountMinor: number;
  categoryId: string;
  description: string;
  /** Calendar date, "YYYY-MM-DD" (local). */
  date: ISODate;
  /** Optional time of day, "HH:mm" (24h). */
  time?: string;
  notes?: string;
  tags?: string[];
  /** Set when this transaction was generated from a recurring template. */
  recurringTemplateId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Budget {
  id: string;
  name: string;
  /** undefined = applies to all expense categories. */
  categoryId?: string;
  /** Monthly spending limit in minor units (positive). */
  limitMinor: number;
  /** Month this budget applies to, "YYYY-MM". */
  month: string;
  /** Optional informative start date; budgets are monthly by design. */
  startDate?: ISODate;
  createdAt: number;
  updatedAt: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  /** Target amount in minor units (positive). */
  targetMinor: number;
  /** Currently saved amount in minor units (>= 0). */
  savedMinor: number;
  /** Optional target completion date. */
  targetDate?: ISODate;
  createdAt: number;
  updatedAt: number;
}

export interface RecurringTemplate {
  id: string;
  name: string;
  type: TxType;
  amountMinor: number;
  categoryId: string;
  frequency: RecurrenceFrequency;
  /** Next scheduled occurrence date ("YYYY-MM-DD"). */
  nextDate: ISODate;
  notes?: string;
  /** When true, occurrences are auto-posted on app open/resume. */
  autoPost: boolean;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Records that an occurrence was already posted, preventing duplicates. */
export interface RecurringOccurrence {
  /** Deterministic id: `${templateId}::${date}`. */
  id: string;
  templateId: string;
  date: ISODate;
  transactionId: string;
  createdAt: number;
}

export interface AppSettings {
  /** Singleton key, always "app". */
  id: "app";
  currency: CurrencyCode;
  language: Language;
  theme: ThemeMode;
  onboarded: boolean;
  pinEnabled: boolean;
  /** Salted hash of the PIN (raw PIN is never stored). */
  pinHash?: string;
  pinSalt?: string;
  /** Whether to require the PIN when the app is resumed. */
  lockOnResume: boolean;
  createdAt: number;
  updatedAt: number;
}

/** A validated backup payload produced by export and accepted by import. */
export interface BackupPayload {
  app: "pennytrack";
  version: number;
  exportedAt: string;
  settings: AppSettings;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringTemplate[];
}
