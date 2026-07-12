// Shared data table shell — consistent padding, borders, empty row

import type { ReactNode } from "react";

type WrapProps = {
  children: ReactNode;
  className?: string;
};

export function DataTableWrap({ children, className = "" }: WrapProps) {
  return <div className={`data-table-wrap ${className}`.trim()}>{children}</div>;
}

type TableProps = {
  children: ReactNode;
  className?: string;
};

export function DataTable({ children, className = "" }: TableProps) {
  return <table className={`data-table ${className}`.trim()}>{children}</table>;
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
      <td colSpan={colSpan} className="data-table-empty-cell">
        {message}
      </td>
    </tr>
  );
}

/** Non-sortable action column header */
export function ActionTh({ label = "Action" }: { label?: string }) {
  return (
    <th className="sortable-th action-th" style={{ textAlign: "center", cursor: "default" }}>
      {label}
    </th>
  );
}
