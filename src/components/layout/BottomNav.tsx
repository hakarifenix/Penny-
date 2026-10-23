import { NavLink } from "react-router-dom";
import { Home, ArrowLeftRight, PieChart, BarChart3, Settings } from "lucide-react";
import { useSettings } from "../../state/SettingsContext";
import type { TranslationKeys } from "../../i18n";

interface NavItem {
  to: string;
  labelKey: TranslationKeys;
  icon: typeof Home;
}

const ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.home", icon: Home },
  { to: "/transactions", labelKey: "nav.transactions", icon: ArrowLeftRight },
  { to: "/budgets", labelKey: "nav.budgets", icon: PieChart },
  { to: "/insights", labelKey: "nav.insights", icon: BarChart3 },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

/** Fixed bottom navigation with active states. RTL-aware via CSS logical order. */
export function BottomNav() {
  const { t } = useSettings();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        {ITEMS.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
                isActive ? "text-primary" : "text-muted hover:text-ink"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-primary/15" : ""
                  }`}
                >
                  <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className="max-w-full truncate px-0.5 text-[11px] font-medium">
                  {t(labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
