import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { App } from "@capacitor/app";
import { useSettings } from "./SettingsContext";
import { verifyPin } from "../lib/pin";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

interface LockContextValue {
  locked: boolean;
  /** Seconds remaining during a lockout (0 when not locked out). */
  lockoutSeconds: number;
  attempts: number;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
}

const LockContext = createContext<LockContextValue | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const pinEnabled = settings.pinEnabled && Boolean(settings.pinHash && settings.pinSalt);
  const lockOnResume = settings.lockOnResume;

  const [locked, setLocked] = useState<boolean>(pinEnabled);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const pinRef = useRef({ hash: settings.pinHash, salt: settings.pinSalt });

  // Keep the latest pin credentials in a ref for the resume handler.
  useEffect(() => {
    pinRef.current = { hash: settings.pinHash, salt: settings.pinSalt };
  }, [settings.pinHash, settings.pinSalt]);

  // If PIN is turned off, never stay locked.
  useEffect(() => {
    if (!pinEnabled) {
      setLocked(false);
      setAttempts(0);
    } else {
      setLocked(true);
    }
  }, [pinEnabled]);

  const lock = useCallback(() => {
    if (pinEnabled) {
      setLocked(true);
      setAttempts(0);
    }
  }, [pinEnabled]);

  // Re-lock when the app is resumed / tab becomes visible again.
  useEffect(() => {
    if (!pinEnabled || !lockOnResume) return;

    const relock = () => {
      setLocked(true);
    };

    const visibility = () => {
      if (document.visibilityState === "visible") relock();
    };

    document.addEventListener("visibilitychange", visibility);
    let handle: { remove: () => Promise<void> } | undefined;
    App.addListener("appStateChange", (state) => {
      if (state.isActive) relock();
    })
      .then((h) => {
        handle = h;
      })
      .catch(() => {
        /* plugin unavailable (web) — visibilitychange covers it */
      });

    return () => {
      document.removeEventListener("visibilitychange", visibility);
      void handle?.remove();
    };
  }, [pinEnabled, lockOnResume]);

  // Countdown ticker while locked out.
  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutSeconds(0);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setLockoutSeconds(remaining > 0 ? remaining : 0);
      if (remaining <= 0) {
        setLockoutUntil(0);
        setAttempts(0);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const unlock = useCallback(
    async (pin: string): Promise<boolean> => {
      const { hash, salt } = pinRef.current;
      if (!hash || !salt) {
        // Credentials missing — allow entry to avoid locking the user out.
        setLocked(false);
        return true;
      }
      if (lockoutUntil && Date.now() < lockoutUntil) return false;
      const ok = await verifyPin(pin, salt, hash);
      if (ok) {
        setLocked(false);
        setAttempts(0);
        return true;
      }
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_MS);
        setAttempts(0);
      }
      return false;
    },
    [attempts, lockoutUntil],
  );

  const value = useMemo<LockContextValue>(
    () => ({ locked, lockoutSeconds, attempts, unlock, lock }),
    [locked, lockoutSeconds, attempts, unlock, lock],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

/** eslint-disable-next-line react-refresh/only-export-components */
export function useLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error("useLock must be used within LockProvider");
  return ctx;
}
