// Status / difficulty chips with consistent mapping

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
};

export default function StatusChip({ status, map }: Props) {
  const key = String(status ?? "").toLowerCase();
  const chip = (map ?? DEFAULT_MAP)[key] ?? "chip-muted";
  return <span className={`chip ${chip}`}>{status}</span>;
}
