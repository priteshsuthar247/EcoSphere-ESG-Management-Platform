"use client";
// Draft + applied list filters; Apply commits draft → query string for server fetch

import { useCallback, useMemo, useState } from "react";

export type ListFilterValues = {
  search: string;
  status: string;
  /** Extra filters e.g. role, scope — passed through to query when non-empty / not "all" */
  extras?: Record<string, string>;
};

const defaultFilters: ListFilterValues = {
  search: "",
  status: "all",
  extras: {},
};

export function buildListQuery(
  applied: ListFilterValues,
  extraParams?: Record<string, string | undefined | null>,
): string {
  const params = new URLSearchParams();
  const search = applied.search.trim();
  if (search) params.set("search", search);
  if (applied.status && applied.status !== "all") {
    params.set("status", applied.status);
  }
  if (applied.extras) {
    for (const [k, v] of Object.entries(applied.extras)) {
      if (v && v !== "all") params.set(k, v);
    }
  }
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v != null && v !== "" && v !== "all") params.set(k, v);
    }
  }
  return params.toString();
}

export function useListQuery(initial?: Partial<ListFilterValues>) {
  const seed: ListFilterValues = {
    search: initial?.search ?? "",
    status: initial?.status ?? "all",
    extras: { ...(initial?.extras ?? {}) },
  };

  const [draft, setDraft] = useState<ListFilterValues>(seed);
  const [applied, setApplied] = useState<ListFilterValues>(seed);

  const setSearch = useCallback((search: string) => {
    setDraft((d) => ({ ...d, search }));
  }, []);

  const setStatus = useCallback((status: string) => {
    setDraft((d) => ({ ...d, status }));
  }, []);

  const setExtra = useCallback((key: string, value: string) => {
    setDraft((d) => ({
      ...d,
      extras: { ...(d.extras ?? {}), [key]: value },
    }));
  }, []);

  const apply = useCallback(() => {
    setApplied({
      search: draft.search,
      status: draft.status,
      extras: { ...(draft.extras ?? {}) },
    });
  }, [draft]);

  const queryString = useMemo(() => buildListQuery(applied), [applied]);

  return {
    draft,
    applied,
    setSearch,
    setStatus,
    setExtra,
    apply,
    queryString,
    /** True when draft differs from applied (user should click Apply) */
    isDirty:
      draft.search !== applied.search ||
      draft.status !== applied.status ||
      JSON.stringify(draft.extras ?? {}) !== JSON.stringify(applied.extras ?? {}),
  };
}
