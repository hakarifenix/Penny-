import { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { SettingsProvider, useSettings } from "./state/SettingsContext";
import { ToastProvider, useToast } from "./state/ToastContext";
import { LockProvider } from "./state/LockContext";
import { AppShell } from "./components/layout/AppShell";
import { Onboarding } from "./components/Onboarding";
import { Logo } from "./components/Logo";
import { Home } from "./pages/Home";
import { Transactions } from "./pages/Transactions";
import { Budgets } from "./pages/Budgets";
import { Insights } from "./pages/Insights";
import { Settings } from "./pages/Settings";

/** Shows a toast whenever recurring transactions are auto-posted. */
function RecurringToastListener() {
  const { t } = useSettings();
  const toast = useToast();
  useEffect(() => {
    const handler = (e: Event) => {
      const count = (e as CustomEvent<number>).detail;
      toast.info(t("recurring.duePosted", { count }));
    };
    window.addEventListener("pennytrack:recurring-posted", handler);
    return () => window.removeEventListener("pennytrack:recurring-posted", handler);
  }, [t, toast]);
  return null;
}

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base">
      <Logo size={64} className="animate-pop" />
      <span className="text-sm text-muted">PennyTrack</span>
    </div>
  );
}

/** Maps the Android hardware back button to in-app navigation. */
function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;
    CapApp.addListener("backButton", ({ canGoBack }) => {
      // On the home screen let the OS minimize the app; elsewhere go back.
      if (canGoBack && location.pathname !== "/") {
        navigate(-1);
      } else {
        void CapApp.exitApp();
      }
    })
      .then((h) => {
        handle = h;
      })
      .catch(() => {
        /* web — hardware back button not applicable */
      });
    return () => {
      void handle?.remove();
    };
  }, [navigate, location.pathname]);

  return null;
}

function AppRoutes() {
  const { settings, loading } = useSettings();
  if (loading) return <Splash />;
  if (!settings.onboarded) return <Onboarding />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <LockProvider>
          <HashRouter>
            <BackButtonHandler />
            <RecurringToastListener />
            <AppRoutes />
          </HashRouter>
        </LockProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}
