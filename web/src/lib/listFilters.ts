// Shared server-side list filter parsing + SQL helpers

import type { NextRequest } from "next/server";

export type ParsedListFilters = {
  search: string;
  status: string;
  role: string;
  scope: string;
  meta: boolean;
};

export function parseListFilters(request: NextRequest): ParsedListFilters {
  const { searchParams } = new URL(request.url);
  return {
    search: (searchParams.get("search") || searchParams.get("q") || "").trim(),
    status: (searchParams.get("status") || "all").trim() || "all",
    role: (searchParams.get("role") || "all").trim() || "all",
    scope: (searchParams.get("scope") || "all").trim() || "all",
    meta: searchParams.get("meta") === "1",
  };
}

/** Escape LIKE wildcards in user search input */
export function likePattern(search: string): string {
  const escaped = search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  return `%${escaped}%`;
}

/**
 * Append AND (col LIKE ? OR …) for multi-column text search.
 * Returns { clause, params } — clause starts with " AND " or is empty.
 */
export function sqlSearchClause(
  search: string,
  columns: string[],
): { clause: string; params: string[] } {
  if (!search.trim() || columns.length === 0) {
    return { clause: "", params: [] };
  }
  const pattern = likePattern(search.trim());
  const parts = columns.map((c) => `${c} LIKE ?`);
  return {
    clause: ` AND (${parts.join(" OR ")})`,
    params: columns.map(() => pattern),
  };
}

export function sqlStatusClause(
  status: string,
  column: string,
  allowAll = true,
): { clause: string; params: string[] } {
  if (!status || (allowAll && status === "all")) {
    return { clause: "", params: [] };
  }
  return { clause: ` AND ${column} = ?`, params: [status] };
}

/** Client-safe in-memory filter for aggregated endpoints that can't SQL-filter easily */
export function filterRowsBySearch<T>(
  rows: T[],
  search: string,
  getFields: (row: T) => Array<string | number | null | undefined>,
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    getFields(row).some((f) => String(f ?? "").toLowerCase().includes(q)),
  );
}

export function filterRowsByStatus<T>(
  rows: T[],
  status: string,
  getStatus: (row: T) => string | null | undefined,
): T[] {
  if (!status || status === "all") return rows;
  const s = status.toLowerCase();
  return rows.filter((row) => String(getStatus(row) ?? "").toLowerCase() === s);
}
