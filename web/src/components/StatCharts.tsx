// Lightweight SVG charts — no external chart library
// Safe for both server and client components

import type { ReactNode } from "react";

export type ChartDatum = {
  label: string;
  value: number;
  color?: string;
};

const DEFAULT_COLORS = [
  "#0075DE",
  "#0D9488",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#64748B",
];

function formatValue(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

type CardProps = {
  title: string;
  children: ReactNode;
  subtitle?: string;
};

export function ChartCard({ title, subtitle, children }: CardProps) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-card-title">{title}</div>
        {subtitle ? <div className="chart-card-subtitle">{subtitle}</div> : null}
      </div>
      <div className="chart-card-body">{children}</div>
    </div>
  );
}

/**
 * Horizontal score bars — ideal for metrics out of 100 (ESG pillars).
 * Fills the card width with clear labels and values; no empty dead space.
 */
export function SimpleBarChart({
  data,
  unit = "",
  maxScale,
}: {
  data: ChartDatum[];
  height?: number;
  unit?: string;
  /** Fixed scale max (e.g. 100 for ESG scores). Defaults to max data value. */
  maxScale?: number;
}) {
  const max = maxScale && maxScale > 0 ? maxScale : Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <div className="chart-empty">No data to chart yet</div>;
  }

  return (
    <div className="score-bars" role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const pct = Math.min(100, Math.max(0, (d.value / max) * 100));
        const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        const isOverall = /overall/i.test(d.label);
        return (
          <div
            key={`${d.label}-${i}`}
            className={`score-bar-row${isOverall ? " score-bar-overall" : ""}`}
          >
            <div className="score-bar-label">{d.label}</div>
            <div className="score-bar-track" title={`${d.label}: ${formatValue(d.value)}${unit}`}>
              <div
                className="score-bar-fill"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <div className="score-bar-value">
              {formatValue(d.value)}
              {unit}
              {maxScale === 100 ? <span className="score-bar-unit">/100</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Donut / ring chart with legend */
export function SimpleDonutChart({
  data,
  size = 132,
}: {
  data: ChartDatum[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + (Number.isFinite(d.value) ? d.value : 0), 0);
  if (total <= 0 || data.length === 0) {
    return <div className="chart-empty">No data to chart yet</div>;
  }

  const r = 56;
  const stroke = 22;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const slices = data.map((d, i) => {
    const value = Math.max(0, d.value);
    const len = (value / total) * c;
    const item = {
      ...d,
      color: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      dash: `${len} ${c - len}`,
      offset: -offset,
      percent: Math.round((value / total) * 100),
    };
    offset += len;
    return item;
  });

  return (
    <div className="donut-layout">
      <svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        role="img"
        aria-label="Donut chart"
        className="chart-svg"
      >
        <g transform="translate(70,70)">
          <circle
            r={r}
            fill="none"
            stroke="var(--color-bg, #f5f5f5)"
            strokeWidth={stroke}
          />
          {slices.map((s, i) => (
            <circle
              key={`${s.label}-${i}`}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              transform="rotate(-90)"
            />
          ))}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="18"
            fontWeight="700"
            fill="var(--color-text-primary, #1a1a1a)"
          >
            {formatValue(total)}
          </text>
          <text
            y={18}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-text-muted, #6b7280)"
          >
            total
          </text>
        </g>
      </svg>
      <ul className="chart-legend">
        {slices.map((s, i) => (
          <li key={`${s.label}-${i}`}>
            <span className="chart-legend-swatch" style={{ background: s.color }} />
            <span className="chart-legend-label">{s.label}</span>
            <span className="chart-legend-value">
              {formatValue(s.value)} · {s.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
