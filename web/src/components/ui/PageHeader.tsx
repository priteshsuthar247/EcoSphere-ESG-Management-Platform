// Shared page title block — Tailwind (DESIGN.md)

type Props = {
  title: string;
  description?: string;
  eyebrow?: string;
};

export default function PageHeader({ title, description, eyebrow }: Props) {
  return (
    <header className="mb-8">
      {eyebrow ? (
        <div className="mb-1.5 text-xs font-semibold text-primary">{eyebrow}</div>
      ) : null}
      <h1 className="mb-1.5 text-[1.75rem] font-bold tracking-tight text-ink">
        {title}
      </h1>
      {description ? (
        <p className="text-[0.9375rem] text-ink-muted">{description}</p>
      ) : null}
    </header>
  );
}
