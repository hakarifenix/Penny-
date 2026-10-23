import type { Language } from "../db/types";
import { en, type Dictionary, type TranslationKeys } from "./en";
import { fr } from "./fr";
import { ar } from "./ar";

const DICTIONARIES: Record<Language, Partial<Dictionary>> = {
  en,
  fr,
  ar,
};

/** BCP-47 locale used for number/date/currency formatting per language. */
const LOCALES: Record<Language, string> = {
  en: "en-US",
  fr: "fr-FR",
  ar: "ar-MA",
};

export const LANGUAGES: Array<{ code: Language; label: string }> = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
];

/** Whether the language uses right-to-left writing/layout. */
export function isRTL(lang: Language): boolean {
  return lang === "ar";
}

export function getLocale(lang: Language): string {
  return LOCALES[lang] ?? "en-US";
}

/** Resolve a translation key, interpolating {param} placeholders. */
export function translate(
  lang: Language,
  key: TranslationKeys,
  params?: Record<string, string | number>,
): string {
  const dict = DICTIONARIES[lang] ?? en;
  let text = dict[key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}

export type { TranslationKeys };
