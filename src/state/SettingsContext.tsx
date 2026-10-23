import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { getSettings, saveSettings, db } from "../db/db";
import { ensureDefaultCategories } from "../services/categories";
import type { AppSettings, Language, ThemeMode } from "../db/types";
import { translate, isRTL, getLocale, type TranslationKeys } from "../i18n";
import type { CurrencyCode } from "../lib/money";

interface SettingsContextValue {
  settings: AppSettings;
  /** True until the initial settings row has been read from IndexedDB. */
  loading: boolean;
  update: (patch: Partial<Omit<AppSettings, "id">>) => Promise<void>;
  /** Bound translation function for the active language. */
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  locale: string;
  currency: CurrencyCode;
  language: Language;
  /** Effective theme after resolving "system". */
  effectiveTheme: "dark" | "light";
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function resolveSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(() => resolveSystemTheme());

  // Initial load: seed default categories (idempotent) then read settings.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureDefaultCategories();
        const s = await getSettings();
        if (!cancelled) setSettings(s);
      } catch (err) {
        console.error("Failed to load settings", err);
        if (!cancelled) {
          // Fall back to sane defaults so the app remains usable.
          setSettings({
            id: "app",
            currency: "MAD",
            language: "en",
            theme: "dark",
            onboarded: true,
            pinEnabled: false,
            lockOnResume: true,
            createdAt: 0,
            updatedAt: 0,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track system theme changes so "system" mode stays live.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => setSystemTheme(mql.matches ? "light" : "dark");
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  const theme: ThemeMode = settings?.theme ?? "dark";
  const effectiveTheme: "dark" | "light" =
    theme === "system" ? systemTheme : theme;

  // Apply theme class to <html>.
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", effectiveTheme === "dark" ? "#0B1020" : "#F4F7FC");
    // Match the native status-bar appearance to the theme (Android/iOS only).
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({
        style: effectiveTheme === "dark" ? Style.Dark : Style.Light,
      }).catch(() => {
        /* status bar plugin unavailable */
      });
    }
  }, [effectiveTheme]);

  // Apply language + direction to <html>.
  const language: Language = settings?.language ?? "en";
  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = isRTL(language) ? "rtl" : "ltr";
  }, [language]);

  const update = useCallback(async (patch: Partial<Omit<AppSettings, "id">>) => {
    setSettings((prev) => ({ ...(prev ?? { id: "app" } as AppSettings), ...patch }) as AppSettings);
    try {
      const saved = await saveSettings(patch);
      setSettings(saved);
    } catch (err) {
      console.error("Failed to save settings", err);
      throw err;
    }
  }, []);

  const value = useMemo<SettingsContextValue>(() => {
    const fallback = { id: "app" } as unknown as AppSettings;
    const current = settings ?? fallback;
    return {
      settings: current,
      loading: settings === null,
      update,
      t: (key, params) => translate(language, key, params),
      dir: isRTL(language) ? "rtl" : "ltr",
      locale: getLocale(language),
      currency: current.currency ?? "MAD",
      language,
      effectiveTheme,
    };
  }, [settings, update, language, effectiveTheme]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** eslint-disable-next-line react-refresh/only-export-components */
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

/** Convenience: is the settings row still loading? */
export function useSettingsLoading(): boolean {
  return useSettings().loading;
}

/** Re-export db for callers that need direct access alongside settings. */
export { db };
