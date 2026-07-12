"use client";
// Client-side multi-type column sorting for dashboard tables

import { useMemo, useState, useCallback } from "react";

export type SortDir = "asc" | "desc";

function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const mul = dir === "asc" ? 1 : -1;

  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  // Dates as ISO-ish strings
  if (typeof a === "string" && typeof b === "string") {
    const da = Date.parse(a);
    const db = Date.parse(b);
    if (!Number.isNaN(da) && !Number.isNaN(db) && /^\d{4}-\d{2}/.test(a) && /^\d{4}-\d{2}/.test(b)) {
      return (da - db) * mul;
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }) * mul;
  }

  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    return (na - nb) * mul;
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true }) * mul;
}

/**
 * Sort rows by a key path. `getValue` extracts the cell value for a column key.
 */
export function useTableSort<T>(
  rows: T[],
  getValue: (row: T, key: string) => unknown,
  defaultKey: string | null = null,
  defaultDir: SortDir = "asc",
) {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  // First click on a column → ascending; second → descending; third → ascending again
  const toggle = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((ra, rb) => compareValues(getValue(ra, sortKey), getValue(rb, sortKey), sortDir));
    return copy;
  }, [rows, sortKey, sortDir, getValue]);

  return { sorted, sortKey, sortDir, toggle };
}
