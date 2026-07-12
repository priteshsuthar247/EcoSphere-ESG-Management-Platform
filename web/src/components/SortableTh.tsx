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
  const title = active
    ? `Sorted ${sortDir === "asc" ? "ascending" : "descending"} — click to reverse`
    : `Sort by ${label} (ascending first)`;

  return (
    <th
      className={`sortable-th${active ? " sortable-th-active" : ""} sortable-th-${sortDir}`}
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
      title={title}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="sortable-th-inner">
        {label}
        <span className="sortable-th-icons" aria-hidden>
          <span className={`sort-arrow sort-asc${active && sortDir === "asc" ? " sort-on" : ""}`}>
            ▲
          </span>
          <span className={`sort-arrow sort-desc${active && sortDir === "desc" ? " sort-on" : ""}`}>
            ▼
          </span>
        </span>
      </span>
    </th>
  );
}
