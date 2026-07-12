// Primary actions below filters — Tailwind

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function ToolbarActions({ children }: Props) {
  if (!children) return null;
  return (
    <div className="toolbar-actions mb-4 flex flex-wrap items-center justify-end gap-3">
      {children}
    </div>
  );
}
