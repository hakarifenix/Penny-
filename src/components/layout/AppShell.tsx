import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { LockScreen } from "../LockScreen";
import { Logo } from "../Logo";
import { useLock } from "../../state/LockContext";
import { useSettings } from "../../state/SettingsContext";
import { useRecurringProcessor } from "../../hooks/useRecurringProcessor";

/** Full-screen loading splash shown while settings are read from IndexedDB. */
function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base">
      <Logo size={64} className="animate-pop" />
      <span className="text-sm text-muted">PennyTrack</span>
    </div>
  );
}

/**
 * Root layout for the authenticated (unlocked) app. Renders the active route
 * with the bottom navigation, gates on the PIN lock, and kicks off the
 * offline recurring-transaction processor.
 */
export function AppShell() {
  const { loading } = useSettings();
  const { locked } = useLock();
  useRecurringProcessor();

  if (loading) return <Splash />;
  if (locked) return <LockScreen />;

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-md bg-base px-4 pb-28">
      <Outlet />
      <BottomNav />
    </div>
  );
}
