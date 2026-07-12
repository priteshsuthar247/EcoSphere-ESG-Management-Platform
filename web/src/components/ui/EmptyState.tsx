// Empty list / empty table body message

type Props = {
  message?: string;
  bordered?: boolean;
};

export default function EmptyState({
  message = "No records found.",
  bordered = true,
}: Props) {
  return (
    <div className={`empty-state${bordered ? " empty-state-bordered" : ""}`}>
      {message}
    </div>
  );
}
