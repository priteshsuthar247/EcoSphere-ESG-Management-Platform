// Centered loading block with spinner

type Props = {
  label?: string;
};

export default function LoadingState({ label = "Loading…" }: Props) {
  return (
    <div className="loading-state">
      <span className="spinner" />
      <span className="loading-state-label">{label}</span>
    </div>
  );
}
