// Success / error message strip

import type { ReactNode } from "react";

type Props = {
  type: "error" | "success";
  children: ReactNode;
};

export default function AlertBanner({ type, children }: Props) {
  return (
    <div className={`msg msg-${type} alert-banner`}>
      <span>{children}</span>
    </div>
  );
}
