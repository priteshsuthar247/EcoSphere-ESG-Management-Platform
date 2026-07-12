// Alert / message banner — supports legacy `type` prop used across pages

type Tone = "error" | "success" | "warn" | "info" | "warning";

const TONE: Record<string, string> = {
  error:
    "border-[rgba(224,62,62,0.3)] bg-[rgba(224,62,62,0.06)] text-[#b42318]",
  success:
    "border-[rgba(26,174,57,0.3)] bg-[rgba(26,174,57,0.06)] text-[#0f7a28]",
  warn: "border-[rgba(221,91,0,0.3)] bg-[rgba(221,91,0,0.06)] text-[#9a4200]",
  warning:
    "border-[rgba(221,91,0,0.3)] bg-[rgba(221,91,0,0.06)] text-[#9a4200]",
  info: "border-[rgba(0,117,222,0.25)] bg-[rgba(0,117,222,0.06)] text-primary-active",
};

type Props = {
  children: React.ReactNode;
  /** Preferred prop */
  tone?: Tone;
  /** Legacy prop used by existing pages */
  type?: Tone;
  className?: string;
};

export default function AlertBanner({
  children,
  tone,
  type,
  className = "",
}: Props) {
  const kind = tone ?? type ?? "info";
  const styles = TONE[kind] ?? TONE.info;

  return (
    <div
      className={`mb-4 flex items-start gap-2 rounded-md border px-4 py-3 text-sm leading-normal ${styles} ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
}
