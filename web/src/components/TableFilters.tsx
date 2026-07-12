"use client";
// Shared filter bar for dashboard tables

import type { ReactNode } from "react";

export type FilterOption = { value: string; label: string };

type Props = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: FilterOption[];
  extra?: ReactNode;
};

export default function TableFilters({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  status,
  onStatusChange,
  statusOptions,
  extra,
}: Props) {
  return (
    <div className="table-filters">
      {onSearchChange !== undefined && (
        <div className="table-filter-field">
          <label className="form-label">Search</label>
          <input
            type="search"
            className="form-input"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
      )}
      {statusOptions && statusOptions.length > 0 && onStatusChange && (
        <div className="table-filter-field">
          <label className="form-label">Status</label>
          <select
            className="form-input"
            value={status ?? "all"}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {extra}
    </div>
  );
}

/** Client-side filter helper for list rows */
export function matchesSearch(
  query: string,
  fields: Array<string | number | null | undefined>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => String(f ?? "").toLowerCase().includes(q));
}

export function matchesStatus(
  filter: string | undefined,
  value: string | null | undefined,
): boolean {
  if (!filter || filter === "all") return true;
  return String(value ?? "").toLowerCase() === filter.toLowerCase();
}
