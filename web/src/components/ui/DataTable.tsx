// Shared data table shell — Tailwind utilities

import type { ReactNode } from "react";

type WrapProps = {
  children: ReactNode;
  className?: string;
};

export function DataTableWrap({ children, className = "" }: WrapProps) {
  return (
    <div
      className={`data-table-wrap overflow-x-auto rounded-lg border border-hairline bg-surface ${className}`.trim()}
    >
      {children}
    </div>
  );
}

type TableProps = {
  children: ReactNode;
  className?: string;
};

export function DataTable({ children, className = "" }: TableProps) {
  return (
    <table
      className={`data-table w-full border-collapse text-left text-sm text-ink-secondary ${className}`.trim()}
    >
      {children}
    </table>
  );
}

type EmptyRowProps = {
  colSpan: number;
  message?: string;
};

export function DataTableEmptyRow({
  colSpan,
  message = "No records found.",
}: EmptyRowProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="data-table-empty-cell px-4 py-8 text-center text-sm text-ink-muted"
      >
        {message}
      </td>
    </tr>
  );
}

/** Non-sortable action column header */
export function ActionTh({ label = "Action" }: { label?: string }) {
  return (
    <th
      className="sortable-th action-th border-b border-hairline bg-canvas px-3 py-2.5 text-center text-xs font-semibold text-ink-faint"
      style={{ cursor: "default" }}
    >
      {label}
    </th>
  );
}
