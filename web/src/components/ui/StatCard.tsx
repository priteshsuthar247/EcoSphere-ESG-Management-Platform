// Metric card used on role dashboards

import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  color?: string;
  hint?: string;
};

export default function StatCard({ label, value, color, hint }: Props) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : undefined}>
        {value}
      </div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}

export function StatsGrid({ children }: { children: ReactNode }) {
  return <div className="stats-grid section-gap">{children}</div>;
}
