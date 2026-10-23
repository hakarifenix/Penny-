import { useRef, useState, type ReactNode } from "react";
import {
  Palette,
  Coins,
  Languages,
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  LayoutGrid,
  Repeat,
  Lock,
  Unlock,
  Info,
  Moon,
  Sun,
} from "lucide-react";
import { useSettings } from "../state/SettingsContext";
import { useToast } from "../state/ToastContext";
import { TopBar } from "../components/layout/TopBar";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Segmented } from "../components/ui/Segmented";
import { Select } from "../components/ui/Field";
import { Sheet } from "../components/ui/Sheet";
import { ConfirmDialog } from "../components/ui/Dialog";
import { CategoryManager } from "../features/categories/CategoryManager";
import { RecurringManager } from "../features/recurring/RecurringManager";
import { PinSetupSheet } from "../features/settings/PinSetupSheet";
import { CURRENCY_CODES, type CurrencyCode } from "../lib/money";
import { LANGUAGES } from "../i18n";
import { buildBackup, parseBackupJSON, importBackup, clearAllData, type ImportMode } from "../services/backup";
import { transactionsToCSV } from "../services/csv";
import { saveTextFile, timestampedFilename } from "../lib/download";
import { db } from "../db/db";
import type { Language, ThemeMode } from "../db/types";

const APP_VERSION = "1.0.0";
const CLEAR_PHRASE = "CLEAR";

export function Settings() {
  const { t, settings, update, effectiveTheme } = useSettings();
  const toast = useToast();

  const [categoryManager, setCategoryManager] = useState(false);
  const [recurringManager, setRecurringManager] = useState(false);
  const [pinSheet, setPinSheet] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearText, setClearText] = useState("");
  const [clearing, setClearing] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<Parameters<typeof importBackup>[0] | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onExportJSON = async () => {
    try {
      const payload = await buildBackup();
      await saveTextFile(
        timestampedFilename("pennytrack-backup", "json"),
        "application/json",
        JSON.stringify(payload, null, 2),
      );
      toast.success(t("settings.exported"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const onExportCSV = async () => {
    try {
      const [transactions, categories] = await Promise.all([
        db.transactions.toArray(),
        db.categories.toArray(),
      ]);
      const map = new Map(categories.map((c) => [c.id, c]));
      const csv = transactionsToCSV(transactions, map, settings.currency);
      await saveTextFile(timestampedFilename("pennytrack-transactions", "csv"), "text/csv", csv);
      toast.success(t("settings.exported"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const payload = parseBackupJSON(text);
      setPendingImport(payload);
      setShowImportConfirm(true);
    } catch {
      toast.error(t("settings.importInvalid"));
    }
  };

  const runImport = async (mode: ImportMode) => {
    if (!pendingImport) return;
    setImporting(true);
    try {
      await importBackup(pendingImport, mode);
      toast.success(t("settings.imported"));
      setShowImportConfirm(false);
      setPendingImport(null);
      window.location.reload();
    } catch {
      toast.error(t("settings.importInvalid"));
    } finally {
      setImporting(false);
    }
  };

  const onClear = async () => {
    setClearing(true);
    try {
      await clearAllData();
      toast.success(t("settings.cleared"));
      setShowClearConfirm(false);
      setClearText("");
      window.location.reload();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setClearing(false);
    }
  };

  const onTogglePin = () => {
    if (settings.pinEnabled) {
      void update({ pinEnabled: false, pinHash: undefined, pinSalt: undefined });
      toast.success(t("settings.pinDisabled"));
    } else {
      setPinSheet(true);
    }
  };

  return (
    <div className="animate-fade-in">
      <TopBar title={t("settings.title")} />

      <div className="space-y-4">
        {/* Appearance */}
        <Section icon={<Palette size={17} />} title={t("settings.appearance")}>
          <div className="px-4 pb-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-ink">
              {effectiveTheme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
              {t("settings.theme")}
            </div>
            <Segmented<ThemeMode>
              value={settings.theme}
              onChange={(theme) => void update({ theme })}
              options={[
                { value: "dark", label: t("settings.theme.dark") },
                { value: "light", label: t("settings.theme.light") },
                { value: "system", label: t("settings.theme.system") },
              ]}
            />
          </div>
        </Section>

        {/* Currency */}
        <Section icon={<Coins size={17} />} title={t("settings.currency")}>
          <div className="px-4 pb-4">
            <Select
              value={settings.currency}
              onChange={(e) => void update({ currency: e.target.value as CurrencyCode })}
              aria-label={t("settings.currency")}
            >
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
            <p className="mt-2 rounded-lg bg-warn/10 p-2.5 text-xs text-warn">
              {t("settings.currencyWarning")}
            </p>
          </div>
        </Section>

        {/* Language */}
        <Section icon={<Languages size={17} />} title={t("settings.language")}>
          <div className="px-4 pb-4">
            <Select
              value={settings.language}
              onChange={(e) => void update({ language: e.target.value as Language })}
              aria-label={t("settings.language")}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
        </Section>

        {/* App */}
        <Section icon={<LayoutGrid size={17} />} title={t("settings.categories")}>
          <div className="space-y-2 px-4 pb-4">
            <Button variant="outline" fullWidth icon={<LayoutGrid size={16} />} onClick={() => setCategoryManager(true)}>
              {t("cat.manage")}
            </Button>
            <Button variant="outline" fullWidth icon={<Repeat size={16} />} onClick={() => setRecurringManager(true)}>
              {t("settings.recurring")}
            </Button>
          </div>
        </Section>

        {/* Privacy */}
        <Section icon={<Lock size={17} />} title={t("settings.privacy")}>
          <div className="space-y-3 px-4 pb-4">
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-3 py-3">
              <span className="flex items-center gap-2 text-sm text-ink">
                {settings.pinEnabled ? <Unlock size={15} className="text-primary" /> : <Lock size={15} />}
                {settings.pinEnabled ? t("settings.pinDisable") : t("settings.pinEnable")}
              </span>
              <Toggle checked={settings.pinEnabled} onChange={onTogglePin} />
            </div>
            {settings.pinEnabled && (
              <>
                <Button variant="outline" fullWidth icon={<Lock size={16} />} onClick={() => setPinSheet(true)}>
                  {t("settings.pinChange")}
                </Button>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-3 py-3">
                  <span className="text-sm text-ink">{t("settings.lockOnResume")}</span>
                  <Toggle checked={settings.lockOnResume} onChange={(v) => void update({ lockOnResume: v })} />
                </div>
              </>
            )}
            <p className="text-xs text-muted">{t("settings.pinNote")}</p>
          </div>
        </Section>

        {/* Data & backup */}
        <Section icon={<Database size={17} />} title={t("settings.data")}>
          <div className="space-y-2 px-4 pb-4">
            <Button variant="outline" fullWidth icon={<Download size={16} />} onClick={onExportJSON}>
              {t("settings.exportJson")}
            </Button>
            <Button
              variant="outline"
              fullWidth
              icon={<Upload size={16} />}
              onClick={() => fileRef.current?.click()}
            >
              {t("settings.importJson")}
            </Button>
            <Button variant="outline" fullWidth icon={<FileSpreadsheet size={16} />} onClick={onExportCSV}>
              {t("settings.exportCsv")}
            </Button>
            <Button
              variant="danger"
              fullWidth
              icon={<Trash2 size={16} />}
              onClick={() => {
                setClearText("");
                setShowClearConfirm(true);
              }}
            >
              {t("settings.clearData")}
            </Button>
          </div>
        </Section>

        {/* About */}
        <Section icon={<Info size={17} />} title={t("settings.about")}>
          <div className="space-y-1 px-4 pb-4 text-sm text-muted">
            <p>{t("app.name")} · {t("settings.version")} {APP_VERSION}</p>
            <p>{t("settings.offline")}</p>
          </div>
        </Section>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onImportFile(file);
          e.target.value = "";
        }}
      />

      <CategoryManager open={categoryManager} onClose={() => setCategoryManager(false)} />
      <RecurringManager open={recurringManager} onClose={() => setRecurringManager(false)} />
      <PinSetupSheet open={pinSheet} onClose={() => setPinSheet(false)} />

      {/* Import mode confirmation */}
      <Sheet
        open={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false);
          setPendingImport(null);
        }}
        title={t("settings.importConfirm.title")}
      >
        <div className="space-y-3 pt-1">
          <p className="text-sm text-muted">{t("settings.importConfirm.body")}</p>
          <Button fullWidth variant="outline" disabled={importing} onClick={() => runImport("merge")}>
            {t("settings.importMerge")}
          </Button>
          <Button fullWidth variant="danger" disabled={importing} onClick={() => runImport("replace")}>
            {t("settings.importReplace")}
          </Button>
        </div>
      </Sheet>

      {/* Clear-all confirmation */}
      <ConfirmDialog
        open={showClearConfirm}
        title={t("settings.clearConfirm.title")}
        body={t("settings.clearConfirm.body")}
        confirmLabel={t("settings.clearData")}
        cancelLabel={t("common.cancel")}
        loading={clearing}
        confirmText={CLEAR_PHRASE}
        confirmTextInput={clearText}
        onConfirmTextChange={setClearText}
        onConfirm={onClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}

/** Labeled settings section with a header and card surface. */
function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line/60 px-4 py-3">
        <span className="text-secondary">{icon}</span>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="pt-3">{children}</div>
    </Card>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-surface"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "start-0.5" : "start-[22px]"}`}
      />
    </button>
  );
}
