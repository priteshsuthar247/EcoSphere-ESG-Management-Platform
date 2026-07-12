// Shared page title block (DESIGN.md spacing)

type Props = {
  title: string;
  description?: string;
  eyebrow?: string;
};

export default function PageHeader({ title, description, eyebrow }: Props) {
  return (
    <header className="page-header">
      {eyebrow ? <div className="page-header-eyebrow">{eyebrow}</div> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
