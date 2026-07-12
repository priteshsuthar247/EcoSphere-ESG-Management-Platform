// Section / card header label above tables and blocks — Tailwind

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function SectionTitle({ children }: Props) {
  return (
    <div className="card-header mb-3 border-b border-hairline pb-3 text-xs font-semibold tracking-wide text-ink">
      {children}
    </div>
  );
}
