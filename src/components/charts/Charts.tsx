import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { useChartTheme } from "./chartTheme";
import { useSettings } from "../../state/SettingsContext";
import { formatMoney, toMajor } from "../../lib/money";

export interface TrendPoint {
  label: string;
  valueMinor: number;
}

interface TrendChartProps {
  data: TrendPoint[];
  /** Accessible summary. */
  ariaLabel?: string;
}

/** Smooth area chart of spending over days within the period. */
export function TrendChart({ data, ariaLabel }: TrendChartProps) {
  const theme = useChartTheme();
  const { currency, locale } = useSettings();

  const renderTooltip = (props: unknown) => {
    const { active, payload } = props as { active?: boolean; payload?: Array<{ payload?: TrendPoint }> };
    if (!active || !payload || !payload.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;
    return (
      <div
        className="rounded-lg border px-3 py-2 text-xs shadow-card"
        style={{ background: theme.tooltipBg, borderColor: theme.tooltipBorder, color: theme.tooltipText }}
      >
        <div className="font-medium">{point.label}</div>
        <div style={{ color: "#35D39A" }}>{formatMoney(point.valueMinor, { currency, locale })}</div>
      </div>
    );
  };

  return (
    <div role="img" aria-label={ariaLabel} className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#35D39A" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#35D39A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: theme.text, fontSize: 11 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: theme.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v: number) => String(Math.round(toMajor(v, currency)))}
          />
          <Tooltip content={renderTooltip} cursor={{ stroke: theme.axis }} />
          <Area
            type="monotone"
            dataKey="valueMinor"
            stroke="#35D39A"
            strokeWidth={2.5}
            fill="url(#trendFill)"
            dot={false}
            activeDot={{ r: 4, fill: "#35D39A", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface Slice {
  id: string;
  name: string;
  valueMinor: number;
  color: string;
}

interface CategoryDonutProps {
  data: Slice[];
  centerLabel?: string;
  ariaLabel?: string;
}

/** Donut chart of spending by category with a center total. */
export function CategoryDonut({ data, centerLabel, ariaLabel }: CategoryDonutProps) {
  const theme = useChartTheme();
  const { currency, locale } = useSettings();
  const total = data.reduce((acc, s) => acc + s.valueMinor, 0);

  const renderTooltip = (props: unknown) => {
    const { active, payload } = props as { active?: boolean; payload?: Array<{ payload?: Slice }> };
    if (!active || !payload || !payload.length) return null;
    const slice = payload[0]?.payload;
    if (!slice) return null;
    return (
      <div
        className="rounded-lg border px-3 py-2 text-xs shadow-card"
        style={{ background: theme.tooltipBg, borderColor: theme.tooltipBorder, color: theme.tooltipText }}
      >
        <div className="font-medium">{slice.name}</div>
        <div>{formatMoney(slice.valueMinor, { currency, locale })}</div>
      </div>
    );
  };

  if (total <= 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-muted" role="img" aria-label={ariaLabel}>
        —
      </div>
    );
  }

  return (
    <div role="img" aria-label={ariaLabel} className="relative h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="valueMinor"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((slice) => (
              <Cell key={slice.id} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip content={renderTooltip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] text-muted">{centerLabel}</span>
        <span className="text-base font-semibold text-ink">
          {formatMoney(total, { currency, locale, compactFraction: true })}
        </span>
      </div>
    </div>
  );
}

interface CompareBarsProps {
  data: Array<{ label: string; incomeMinor: number; expenseMinor: number }>;
  ariaLabel?: string;
}

/** Grouped bar chart comparing income vs expenses across periods. */
export function CompareBars({ data, ariaLabel }: CompareBarsProps) {
  const theme = useChartTheme();
  const { currency, locale } = useSettings();

  const renderTooltip = (props: unknown) => {
    const { active, payload, label } = props as {
      active?: boolean;
      payload?: Array<{ dataKey?: string | number; value?: number; color?: string }>;
      label?: string;
    };
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        className="rounded-lg border px-3 py-2 text-xs shadow-card"
        style={{ background: theme.tooltipBg, borderColor: theme.tooltipBorder, color: theme.tooltipText }}
      >
        <div className="mb-1 font-medium">{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>
            {p.dataKey === "incomeMinor" ? "+" : "−"}
            {formatMoney(p.value ?? 0, { currency, locale })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div role="img" aria-label={ariaLabel} className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: theme.text, fontSize: 11 }} axisLine={{ stroke: theme.axis }} tickLine={false} />
          <YAxis tick={{ fill: theme.text, fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => String(Math.round(toMajor(v, currency)))} />
          <Tooltip content={renderTooltip} cursor={{ fill: theme.grid, opacity: 0.3 }} />
          <ReferenceLine y={0} stroke={theme.axis} />
          <Bar dataKey="incomeMinor" fill="#35D39A" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expenseMinor" fill="#6EA8FE" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
