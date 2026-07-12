// Primary actions below filters — right-aligned so they stay distinct from filters

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function ToolbarActions({ children }: Props) {
  if (!children) return null;
  return <div className="toolbar-actions">{children}</div>;
}
