"use client";
// Shared filter bar — draft inputs + Apply (server-side query). No primary Add buttons here.

import type { ReactNode, FormEvent } from "react";

export type FilterOption = { value: string; label: string };

type Props = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: FilterOption[];
  /** Extra filter controls only (role, scope, etc.) — not action buttons */
  extraFields?: ReactNode;
  /** Commit draft filters → parent refetches with query params */
  onApply: () => void;
  applying?: boolean;
  applyLabel?: string;
};

export default function TableFilters({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  status,
  onStatusChange,
  statusOptions,
  extraFields,
  onApply,
  applying = false,
  applyLabel = "Apply",
}: Props) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onApply();
  }

  return (
    <form className="table-filters" onSubmit={handleSubmit}>
      {onSearchChange !== undefined && (
        <div className="table-filter-field">
          <label className="form-label">Search</label>
          <input
            type="search"
            className="form-input"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            disabled={applying}
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
            disabled={applying}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {extraFields}
      <div className="table-filter-actions">
        <button type="submit" className="btn btn-primary btn-md" disabled={applying}>
          {applying ? "Applying…" : applyLabel}
        </button>
      </div>
    </form>
  );
}

/** @deprecated Prefer server-side filters via query + Apply. Kept for rare client-only matrices. */
export function matchesSearch(
  query: string,
  fields: Array<string | number | null | undefined>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => String(f ?? "").toLowerCase().includes(q));
}

/** @deprecated Prefer server-side status query param. */
export function matchesStatus(
  filter: string | undefined,
  value: string | null | undefined,
): boolean {
  if (!filter || filter === "all") return true;
  return String(value ?? "").toLowerCase() === filter.toLowerCase();
}
