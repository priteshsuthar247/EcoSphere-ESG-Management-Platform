// Metric card — Tailwind utilities (DESIGN.md)

import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  color?: string;
  hint?: string;
};

export default function StatCard({ label, value, color, hint }: Props) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4 shadow-none transition-shadow hover:shadow-soft">
      <div className="mb-2 text-xs font-semibold text-ink-faint">{label}</div>
      <div
        className="text-[1.75rem] font-bold leading-tight tracking-tight text-primary"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-ink-faint">{hint}</div> : null}
    </div>
  );
}

export function StatsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4">
      {children}
    </div>
  );
}
