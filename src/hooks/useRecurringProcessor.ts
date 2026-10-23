import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { processDueRecurring } from "../services/recurring";
import { useSettings } from "../state/SettingsContext";

/**
 * Runs the offline recurring-transaction processor once when the app becomes
 * ready and again whenever it is resumed. Posting is duplicate-safe (guarded by
 * occurrence IDs), so repeated runs never double-post. Results are surfaced via
 * a window custom event that the app's toast layer listens for.
 */
export function useRecurringProcessor(): void {
  const { loading } = useSettings();
  const ranRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    const run = async () => {
      try {
        const result = await processDueRecurring();
        if (result.posted > 0) {
          window.dispatchEvent(
            new CustomEvent("pennytrack:recurring-posted", { detail: result.posted }),
          );
        }
      } catch (err) {
        console.error("Recurring processing failed", err);
      }
    };

    // Initial run (after a tick so the UI paints first).
    const id = setTimeout(() => {
      if (!ranRef.current) {
        ranRef.current = true;
        void run();
      }
    }, 300);

    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);

    let pluginHandle: { remove: () => Promise<void> } | undefined;
    App.addListener("appStateChange", (state) => {
      if (state.isActive) void run();
    })
      .then((h) => {
        pluginHandle = h;
      })
      .catch(() => {
        /* web — visibilitychange covers it */
      });

    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", onVisible);
      void pluginHandle?.remove();
    };
  }, [loading]);
}
