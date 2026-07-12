// Empty state panel — Tailwind

type Props = {
  message: string;
  className?: string;
};

export default function EmptyState({ message, className = "" }: Props) {
  return (
    <div
      className={`rounded-lg border border-hairline bg-surface px-6 py-8 text-center text-sm text-ink-muted ${className}`}
    >
      {message}
    </div>
  );
}
