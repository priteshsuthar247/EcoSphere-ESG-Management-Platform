// Section / card header label above tables and blocks

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function SectionTitle({ children }: Props) {
  return <div className="card-header">{children}</div>;
}
