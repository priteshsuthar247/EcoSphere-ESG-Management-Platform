"use client";
// src/app/dashboard/gamification/participation/page.tsx
// Challenge Participation approvals - managers only (employees redirected by middleware)

import { useState, useEffect, useCallback } from "react";
import { useSessionRole } from "@/components/useSessionRole";
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

interface Participation {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  challenge_id: number;
  challenge_title: string;
  xp_reward: number;
  progress_percent: number;
  approval_status: string;
  xp_awarded: number;
  joined_at: string;
  completed_at: string | null;
}

export default function ChallengeParticipationPage() {
  const { isManager } = useSessionRole();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const { draft, setSearch, setStatus, apply, queryString } = useListQuery();

  const fetchParticipations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/gamification/participation${queryString ? `?${queryString}` : ""}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load participations ledger");
      }

      setParticipations(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchParticipations();
  }, [fetchParticipations]);

  async function handleReview(id: number, status: "approved" | "rejected") {
    setProcessingId(id);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/gamification/participation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update participation log");
      }

      setSuccess(`Participation log successfully marked as ${status}.`);
      fetchParticipations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessingId(null);
    }
  }

    const getSortValue = useCallback((row: Participation, key: string): unknown => {
    switch (key) {
      case "id": return row.id;
      case "employee": return row.user_name;
      case "challenge": return row.challenge_title;
      case "reward": return row.xp_reward;
      case "progress": return row.progress_percent;
      case "date": return row.joined_at ?? "";
      case "status": return row.approval_status;
      default: return null;
    }
  }, []);

  const { sorted, sortKey, sortDir, toggle } = useTableSort(participations, getSortValue, "id");

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          CHALLENGE VERIFICATIONS
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Audit employee challenge completion proofs, approve point transfers, and monitor sustainability metrics.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {success && <AlertBanner type="success">{success}</AlertBanner>}

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)" }}>
            Loading verifications…
          </span>
        </div>
      ) : (
        <div>
          <TableFilters
            search={draft.search}
            onSearchChange={setSearch}
            searchPlaceholder="Search employee, challenge…"
            status={draft.status}
            onStatusChange={setStatus}
            statusOptions={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          onApply={apply}

          applying={loading}

          />
          <div className="card-header">Participation verification records</div>
          
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh label="ID" columnKey="id" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Employee" columnKey="employee" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Challenge" columnKey="challenge" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Reward" columnKey="reward" sortKey={sortKey} sortDir={sortDir} onSort={toggle} align="right" />
                  <SortableTh label="Progress" columnKey="progress" sortKey={sortKey} sortDir={sortDir} onSort={toggle} align="right" />
                  <SortableTh label="Submit date" columnKey="date" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Status" columnKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <th className="sortable-th" style={{ textAlign: "center", cursor: "default" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                      No participations logged for review.
                    </td>
                  </tr>
                ) : (
                  sorted.map((p) => (
                    <tr 
                      key={p.id} 
                      style={{ 
                        borderBottom: "1px solid var(--color-border-subtle)",
                        background: p.approval_status === "pending" ? "rgba(0, 191, 255, 0.02)" : "transparent"
                      }}
                    >
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(p.id).padStart(3, "0")}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)" }}>
                        <div>{p.user_name}</div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>{p.user_email}</div>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)", fontWeight: 500 }}>{p.challenge_title}</td>
                      <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-primary)" }}>{p.xp_reward} XP</td>
                      <td style={{ padding: "10px var(--space-3)", textAlign: "right", color: "var(--color-text-primary)" }}>
                        {p.progress_percent}%
                        <div style={{ width: "100%", height: "3px", background: "var(--color-border-subtle)", marginTop: "4px" }}>
                          <div style={{ height: "100%", background: "var(--color-primary)", width: `${p.progress_percent}%` }} />
                        </div>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{p.joined_at ? p.joined_at.split("T")[0] : "–"}</td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <span className={`chip ${p.approval_status === "approved" ? "chip-green" : p.approval_status === "pending" ? "chip-cyan" : "chip-red"}`}>
                          {p.approval_status}
                        </span>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", textAlign: "center" }}>
                        {!isManager ? (
                          <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>—</span>
                        ) : p.approval_status === "pending" ? (
                          <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleReview(p.id, "approved")}
                              disabled={processingId !== null}
                              className="btn btn-primary btn-sm"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReview(p.id, "rejected")}
                              disabled={processingId !== null}
                              className="btn btn-danger btn-sm"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>
                            Reviewed {p.completed_at ? p.completed_at.split("T")[0] : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
