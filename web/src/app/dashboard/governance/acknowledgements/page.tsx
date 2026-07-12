"use client";
// Policy Acknowledgements — TerminalUI

import { useCallback, useEffect, useState } from "react";
import TableFilters from "@/components/TableFilters";
import { useListQuery } from "@/components/useListQuery";
import PageHeader from "@/components/ui/PageHeader";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import ToolbarActions from "@/components/ui/ToolbarActions";
import SectionTitle from "@/components/ui/SectionTitle";
import StatusChip from "@/components/ui/StatusChip";
import {
  DataTableWrap,
  DataTable,
  DataTableEmptyRow,
  ActionTh,
} from "@/components/ui/DataTable";
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";

interface Ack {
  id: number;
  user_name: string;
  user_email: string;
  user_department_name: string | null;
  policy_id: number;
  policy_title: string;
  policy_version: string | null;
  policy_version_current: string;
  acknowledged_at: string;
  ip_address: string | null;
}

interface Coverage {
  policy_id: number;
  title: string;
  version: string;
  status: string;
  acknowledged: number;
  active_users: number;
  coverage_percent: number;
}

interface Stats {
  total: number;
  unique_users: number;
  unique_policies: number;
  pending_acks: number;
}

export default function AcknowledgementsPage() {
  const [items, setItems] = useState<Ack[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { draft, applied, setSearch, setStatus, apply, queryString } = useListQuery();
  const [logSearch, setLogSearch] = useState("");
  const [logApplySearch, setLogApplySearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/governance/acknowledgements${queryString ? `?${queryString}` : ""}`,
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load acknowledgements");
      setItems(json.data.items ?? []);
      setCoverage(json.data.coverage ?? []);
      setStats(json.data.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Coverage is aggregated client-side from server payload; filter on applied values after Apply
  const filteredCoverage = coverage.filter((c) => {
    if (applied.status !== "all" && c.status !== applied.status) return false;
    const q = applied.search.trim().toLowerCase();
    if (!q) return true;
    return [c.title, c.version, c.status].some((f) =>
      String(f ?? "").toLowerCase().includes(q),
    );
  });

  // Log rows already search-filtered by API (queryString); optional secondary local apply
  const filteredLog = items.filter((a) => {
    const q = logApplySearch.trim().toLowerCase();
    if (!q) return true;
    return [a.id, a.user_name, a.user_email, a.user_department_name, a.policy_title, a.ip_address].some(
      (f) => String(f ?? "").toLowerCase().includes(q),
    );
  });

  const getCoverageSort = useCallback((row: Coverage, key: string): unknown => {
    switch (key) {
      case "policy": return row.title;
      case "version": return row.version;
      case "status": return row.status;
      case "acked": return row.acknowledged;
      case "active_users": return row.active_users;
      case "coverage": return row.coverage_percent;
      default: return null;
    }
  }, []);

  const getLogSort = useCallback((row: Ack, key: string): unknown => {
    switch (key) {
      case "id": return row.id;
      case "user": return row.user_name;
      case "dept": return row.user_department_name ?? "";
      case "policy": return row.policy_title;
      case "version": return row.policy_version || row.policy_version_current || "";
      case "acked_at": return row.acknowledged_at ?? "";
      case "ip": return row.ip_address ?? "";
      default: return null;
    }
  }, []);

  const {
    sorted: sortedCoverage,
    sortKey: covSortKey,
    sortDir: covSortDir,
    toggle: covToggle,
  } = useTableSort(filteredCoverage, getCoverageSort, "policy");

  const {
    sorted: sortedLog,
    sortKey: logSortKey,
    sortDir: logSortDir,
    toggle: logToggle,
  } = useTableSort(filteredLog, getLogSort, "id");

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          POLICY ACKNOWLEDGEMENTS
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Track who has acknowledged ESG policies and coverage gaps.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {error && <AlertBanner type="error">{error}</AlertBanner>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "TOTAL ACKS", value: stats?.total, color: "var(--color-primary)" },
          { label: "USERS", value: stats?.unique_users, color: "var(--color-tertiary)" },
          { label: "POLICIES", value: stats?.unique_policies, color: "var(--color-secondary)" },
          { label: "PENDING", value: stats?.pending_acks, color: "var(--color-error)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value ?? "–"}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)" }}>Loading…</span>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "var(--space-8)" }}>
            <TableFilters
              search={draft.search}
              onSearchChange={setSearch}
              searchPlaceholder="Search policies…"
              status={draft.status}
              onStatusChange={setStatus}
              statusOptions={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "draft", label: "Draft" },
              ]}
              onApply={apply}
              applying={loading}
            />
            <div className="card-header">Coverage matrix</div>
            {sortedCoverage.length === 0 ? (
              <div style={{ padding: "var(--space-6)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", textAlign: "center" }}>
                No policies requiring acknowledgement.
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <SortableTh label="Policy" columnKey="policy" sortKey={covSortKey} sortDir={covSortDir} onSort={covToggle} />
                      <SortableTh label="Version" columnKey="version" sortKey={covSortKey} sortDir={covSortDir} onSort={covToggle} />
                      <SortableTh label="Status" columnKey="status" sortKey={covSortKey} sortDir={covSortDir} onSort={covToggle} />
                      <SortableTh label="Acked" columnKey="acked" sortKey={covSortKey} sortDir={covSortDir} onSort={covToggle} />
                      <SortableTh label="Active users" columnKey="active_users" sortKey={covSortKey} sortDir={covSortDir} onSort={covToggle} />
                      <SortableTh label="Coverage" columnKey="coverage" sortKey={covSortKey} sortDir={covSortDir} onSort={covToggle} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCoverage.map((c) => (
                      <tr key={c.policy_id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)" }}>{c.title}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>v{c.version}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${c.status === "active" ? "chip-green" : "chip-muted"}`}>{c.status}</span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-tertiary)" }}>{c.acknowledged}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{c.active_users}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                            <div style={{ flex: 1, height: "8px", border: "1px solid var(--color-border-medium)", background: "var(--color-bg)", maxWidth: "120px" }}>
                              <div style={{ height: "100%", width: `${Math.min(100, c.coverage_percent)}%`, background: c.coverage_percent >= 80 ? "var(--color-primary)" : c.coverage_percent >= 50 ? "var(--color-secondary)" : "var(--color-error)" }} />
                            </div>
                            <span style={{ color: "var(--color-primary)", fontSize: "12px" }}>{c.coverage_percent}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <TableFilters
              search={logSearch}
              onSearchChange={setLogSearch}
              searchPlaceholder="Search acknowledgements by user, policy, dept…"
              onApply={() => {
                setLogApplySearch(logSearch);
              }}
              applying={loading}
            />
            <div className="card-header">Acknowledgement log</div>
            {sortedLog.length === 0 ? (
              <div style={{ padding: "var(--space-6)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", textAlign: "center" }}>
                No acknowledgements recorded yet.
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <SortableTh label="ID" columnKey="id" sortKey={logSortKey} sortDir={logSortDir} onSort={logToggle} />
                      <SortableTh label="User" columnKey="user" sortKey={logSortKey} sortDir={logSortDir} onSort={logToggle} />
                      <SortableTh label="Dept" columnKey="dept" sortKey={logSortKey} sortDir={logSortDir} onSort={logToggle} />
                      <SortableTh label="Policy" columnKey="policy" sortKey={logSortKey} sortDir={logSortDir} onSort={logToggle} />
                      <SortableTh label="Version" columnKey="version" sortKey={logSortKey} sortDir={logSortDir} onSort={logToggle} />
                      <SortableTh label="Acked at" columnKey="acked_at" sortKey={logSortKey} sortDir={logSortDir} onSort={logToggle} />
                      <SortableTh label="IP" columnKey="ip" sortKey={logSortKey} sortDir={logSortDir} onSort={logToggle} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLog.map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(a.id).padStart(3, "0")}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <div style={{ color: "var(--color-text-primary)" }}>{a.user_name}</div>
                          <div style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>{a.user_email}</div>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{a.user_department_name || "—"}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{a.policy_title}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-tertiary)" }}>v{a.policy_version || a.policy_version_current}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                          {String(a.acknowledged_at).slice(0, 19).replace("T", " ")}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{a.ip_address || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
