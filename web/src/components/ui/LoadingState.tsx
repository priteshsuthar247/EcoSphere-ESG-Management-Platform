// Loading indicator — Tailwind

type Props = {
  label?: string;
};

export default function LoadingState({ label = "Loading…" }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-10 text-sm text-ink-muted">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line-medium border-t-primary"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
