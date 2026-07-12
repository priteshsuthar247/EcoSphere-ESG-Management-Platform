"use client";
// Clickable table header for useTableSort

import type { SortDir } from "@/components/useTableSort";

type Props = {
  label: string;
  columnKey: string;
  sortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  align?: "left" | "center" | "right";
};

export default function SortableTh({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  align = "left",
}: Props) {
  const active = sortKey === columnKey;
  const arrow = !active ? "↕" : sortDir === "asc" ? "↑" : "↓";

  return (
    <th
      className={`sortable-th${active ? " sortable-th-active" : ""}`}
      style={{ textAlign: align }}
      onClick={() => onSort(columnKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort(columnKey);
        }
      }}
      tabIndex={0}
      role="columnheader"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="sortable-th-inner">
        {label}
        <span className="sortable-th-icon" aria-hidden>
          {arrow}
        </span>
      </span>
    </th>
  );
}
