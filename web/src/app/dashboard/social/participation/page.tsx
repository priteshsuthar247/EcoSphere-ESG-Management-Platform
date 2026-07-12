"use client";
// src/app/dashboard/social/participation/page.tsx
// Employee CSR Participation

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
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
  user_department_name: string | null;
  csr_activity_id: number;
  activity_title: string;
  activity_status: string;
  activity_points: number;
  evidence_required: number;
  scheduled_date: string | null;
  joined_at: string;
  completion_date: string | null;
  proof_url: string | null;
  approval_status: "pending" | "approved" | "rejected";
  points_earned: number;
  approved_by_name: string | null;
  rejection_reason: string | null;
}

interface ActivityOption {
  id: number;
  title: string;
  status: string;
  points_awarded: number;
  participant_count: number;
  max_participants: number | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  total_points_awarded: number;
}

export default function EmployeeParticipationPage() {
  const [items, setItems] = useState<Participation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [canApprove, setCanApprove] = useState(false);
  const [viewerId, setViewerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { draft, setSearch, setStatus, apply, queryString } = useListQuery();
  const [joinActivityId, setJoinActivityId] = useState("");
  const [joining, setJoining] = useState(false);
  const [submitId, setSubmitId] = useState<number | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(queryString);
      params.set("meta", "1");
      const res = await fetch(`/api/social/participations?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load participations");
      setItems(json.data.items);
      setStats(json.data.stats);
      setActivities(json.data.activities ?? []);
      setCanApprove(Boolean(json.data.viewer?.canApprove));
      setViewerId(json.data.viewer?.id ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinActivityId) return;
    setJoining(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/social/participations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", activity_id: Number(joinActivityId) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Join failed");
      setSuccess("Joined activity successfully.");
      setJoinActivityId("");
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoining(false);
    }
  }

  async function handleSubmitProof(e: React.FormEvent) {
    e.preventDefault();
    if (!submitId) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/social/participations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          participation_id: submitId,
          completion_date: completionDate || null,
          proof_url: proofUrl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Submit failed");
      setSuccess("Participation submitted for review.");
      setSubmitId(null);
      setProofUrl("");
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(participationId: number, decision: "approved" | "rejected") {
    setReviewingId(participationId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/social/participations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: participationId,
          decision,
          rejection_reason: decision === "rejected" ? rejectReason || "Rejected by reviewer" : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Review failed");
      setSuccess(`Participation ${decision}.`);
      setRejectReason("");
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReviewingId(null);
    }
  }

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border-medium)",
    color: "var(--color-primary)",
    fontFamily: "var(--font-mono)",
    fontSize: "14px",
    outline: "none",
    borderRadius: "0px",
  };

  function statusChip(status: string) {
    if (status === "approved") return "chip-green";
    if (status === "pending") return "chip-amber";
    return "chip-red";
  }

  // Hide activities the current user has already joined from the join selector
  const joinable = activities.filter((a) => {
    if (["cancelled", "archived", "completed"].includes(a.status)) return false;
    if (viewerId == null) return true;
    return !items.some((p) => p.user_id === viewerId && p.csr_activity_id === a.id);
  });

    const getSortValue = useCallback((row: Participation, key: string): unknown => {
    switch (key) {
      case "id": return row.id;
      case "employee": return row.user_name;
      case "activity": return row.activity_title;
      case "status": return row.approval_status;
      case "proof": return row.proof_url ?? (row.evidence_required ? "required" : "");
      case "pts": return row.points_earned;
      default: return null;
    }
  }, []);

  const { sorted, sortKey, sortDir, toggle } = useTableSort(items, getSortValue, "id");

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
          Employee participation
        </h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
          Join CSR activities, submit proof, and review participation approvals.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "Total", value: stats?.total, color: "var(--color-primary)" },
          { label: "Pending", value: stats?.pending, color: "var(--color-secondary)" },
          { label: "Approved", value: stats?.approved, color: "var(--color-primary)" },
          { label: "Rejected", value: stats?.rejected, color: "var(--color-error)" },
          { label: "Points awarded", value: stats?.total_points_awarded, color: "var(--color-tertiary)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: "12px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>{s.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value ?? "–"}</div>
          </div>
        ))}
      </div>

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {success && <AlertBanner type="success">{success}</AlertBanner>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div className="card-elevated">
          <div className="card-header">Join activity</div>
          <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <select value={joinActivityId} onChange={(e) => setJoinActivityId(e.target.value)} className="form-input" disabled={joining}>
              <option value="">Select a CSR activity</option>
              {joinable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} · {a.points_awarded} pts · {a.status}
                </option>
              ))}
            </select>
            {joinable.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--color-text-dim)" }}>
                No open activities left to join (already joined or none available).
              </div>
            )}
            <button type="submit" className={`btn btn-primary btn-md${joining ? " btn-loading" : ""}`} disabled={joining || !joinActivityId}>
              {joining ? "Joining…" : "Join"}
            </button>
          </form>
        </div>

      </div>

      <TableFilters
        search={draft.search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employee, activity…"
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
      <div>
        <div>
          <div className="card-header">Participation ledger</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)" }}>Loading…</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
              No participation records found.
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                <thead>
                  <tr>
                    <SortableTh label="ID" columnKey="id" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="EMPLOYEE" columnKey="employee" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="ACTIVITY" columnKey="activity" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="STATUS" columnKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="PROOF" columnKey="proof" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="PTS" columnKey="pts" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <th className="sortable-th" style={{ textAlign: "center", cursor: "default" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(p.id).padStart(3, "0")}</td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <div style={{ color: "var(--color-text-primary)" }}>{p.user_name}</div>
                        <div style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>{p.user_department_name || "no dept"}</div>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                        {p.activity_title}
                        <div style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>
                          {p.scheduled_date ? String(p.scheduled_date).slice(0, 10) : "—"} · {p.activity_points} pts
                        </div>
                      </td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <span className={`chip ${statusChip(p.approval_status)}`}>{p.approval_status}</span>
                        {p.rejection_reason && (
                          <div style={{ color: "var(--color-error)", fontSize: "11px", marginTop: "4px" }}>{p.rejection_reason}</div>
                        )}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.proof_url ? (
                          <a href={p.proof_url} target="_blank" rel="noreferrer" style={{ color: "var(--color-tertiary)" }}>
                            proof
                          </a>
                        ) : p.evidence_required ? (
                          <span style={{ color: "var(--color-secondary)" }}>required</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-primary)" }}>{p.points_earned}</td>
                      <td style={{ padding: "10px var(--space-3)", textAlign: "center", whiteSpace: "nowrap" }}>
                        {viewerId === p.user_id && p.approval_status !== "approved" && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: "6px" }}
                            onClick={() => {
                              setSubmitId(p.id);
                              setProofUrl(p.proof_url || "");
                              setCompletionDate(p.completion_date ? String(p.completion_date).slice(0, 10) : new Date().toISOString().slice(0, 10));
                            }}
                          >
                            Proof
                          </button>
                        )}
                        {canApprove && p.approval_status === "pending" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ marginRight: "6px" }}
                              disabled={reviewingId === p.id}
                              onClick={() => handleReview(p.id, "approved")}
                            >
                              approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={reviewingId === p.id}
                              onClick={() => handleReview(p.id, "rejected")}
                            >
                              reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canApprove && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <div className="form-group" style={{ maxWidth: "420px" }}>
                <label className="form-label" htmlFor="rej">DEFAULT REJECTION REASON</label>
                <div className="input-wrapper">
                  <input id="rej" className="form-input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="optional reason used on reject" />
                </div>
              </div>
            </div>
          )}
        </div>

        <Modal
          open={Boolean(submitId)}
          title={`Submit proof · ${submitId ?? ""}`}
          onClose={() => { if (!submitting) setSubmitId(null); }}
          width={480}
        >
            <form onSubmit={handleSubmitProof}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label required" htmlFor="cd">Completion date</label>
                  <input id="cd" type="date" className="form-input" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pu">Proof URL / link</label>
                  <input id="pu" className="form-input" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." disabled={submitting} />
                  <div style={{ fontSize: "12px", color: "var(--color-text-dim)", marginTop: "4px" }}>
                    Paste a link to proof (stored as an attachment record for approval).
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button type="submit" className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit proof"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-md btn-full" onClick={() => setSubmitId(null)} disabled={submitting}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
        </Modal>
      </div>
    </div>
  );
}
