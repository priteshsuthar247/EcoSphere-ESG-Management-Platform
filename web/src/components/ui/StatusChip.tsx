// Status / difficulty chips with consistent mapping — Tailwind-styled

type Props = {
  status: string;
  map?: Record<string, string>;
};

const DEFAULT_MAP: Record<string, string> = {
  active: "chip-green",
  approved: "chip-green",
  completed: "chip-green",
  fulfilled: "chip-green",
  pending: "chip-cyan",
  under_review: "chip-cyan",
  in_progress: "chip-cyan",
  upcoming: "chip-cyan",
  draft: "chip-muted",
  inactive: "chip-muted",
  archived: "chip-muted",
  cancelled: "chip-muted",
  rejected: "chip-red",
  overdue: "chip-red",
  open: "chip-amber",
  at_risk: "chip-amber",
  easy: "chip-green",
  medium: "chip-cyan",
  hard: "chip-amber",
  critical: "chip-red",
  high: "chip-amber",
  low: "chip-muted",
};

/** Tailwind class sets (also works with legacy .chip CSS) */
const TW: Record<string, string> = {
  "chip-green":
    "inline-flex items-center rounded-full border border-[rgba(26,174,57,0.2)] bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-[#0f7a28]",
  "chip-amber":
    "inline-flex items-center rounded-full border border-[rgba(221,91,0,0.2)] bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-[#9a4200]",
  "chip-cyan":
    "inline-flex items-center rounded-full border border-[rgba(0,117,222,0.18)] bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-active",
  "chip-red":
    "inline-flex items-center rounded-full border border-[rgba(224,62,62,0.2)] bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-[#b42318]",
  "chip-muted":
    "inline-flex items-center rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink-muted",
};

export default function StatusChip({ status, map }: Props) {
  const key = String(status ?? "").toLowerCase();
  const chipKey = (map ?? DEFAULT_MAP)[key] ?? "chip-muted";
  const tw = TW[chipKey] ?? TW["chip-muted"];
  return <span className={`${chipKey} ${tw}`}>{status}</span>;
}
