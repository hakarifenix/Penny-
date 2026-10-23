import { useSettings } from "../../state/SettingsContext";

export interface ChartTheme {
  grid: string;
  text: string;
  axis: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
  /** Categorical palette for pie/bar series. */
  palette: string[];
}

const DARK: ChartTheme = {
  grid: "#1E2A44",
  text: "#9AA7BD",
  axis: "#22304d",
  tooltipBg: "#141B2D",
  tooltipText: "#F4F7FC",
  tooltipBorder: "#22304d",
  palette: ["#35D39A", "#6EA8FE", "#A78BFA", "#F97316", "#EC4899", "#F59E0B", "#22C55E", "#38BDF8", "#14B8A6", "#64748B"],
};

const LIGHT: ChartTheme = {
  grid: "#E2E8F0",
  text: "#64748B",
  axis: "#E2E8F0",
  tooltipBg: "#FFFFFF",
  tooltipText: "#0F172A",
  tooltipBorder: "#E2E8F0",
  palette: ["#16A34A", "#2563EB", "#7C3AED", "#EA580C", "#DB2777", "#D97706", "#059669", "#0284C7", "#0D9488", "#64748B"],
};

/** Resolve a chart palette that matches the current light/dark theme. */
export function useChartTheme(): ChartTheme {
  const { effectiveTheme } = useSettings();
  return effectiveTheme === "dark" ? DARK : LIGHT;
}
