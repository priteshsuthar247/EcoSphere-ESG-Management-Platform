"use client";
// src/app/dashboard/social/participation/page.tsx
// Employee CSR Participation — TerminalUI

import { useCallback, useEffect, useState } from "react";

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
  const [statusFilter, setStatusFilter] = useState("all");
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
      const params = new URLSearchParams({ meta: "1", status: statusFilter });
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
  }, [statusFilter]);

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

  const joinable = activities.filter((a) => !["cancelled", "archived"].includes(a.status));

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # SOCIAL / EMPLOYEE-PARTICIPATION
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          EMPLOYEE PARTICIPATION
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Join CSR activities, submit proof, and review participation approvals.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "TOTAL", value: stats?.total, color: "var(--color-primary)" },
          { label: "PENDING", value: stats?.pending, color: "var(--color-secondary)" },
          { label: "APPROVED", value: stats?.approved, color: "var(--color-primary)" },
          { label: "REJECTED", value: stats?.rejected, color: "var(--color-error)" },
          { label: "POINTS AWARDED", value: stats?.total_points_awarded, color: "var(--color-tertiary)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>// {s.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value ?? "–"}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
          <span>[ERR]</span><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="msg msg-success" style={{ marginBottom: "var(--space-4)" }}>
          <span>[OK]</span><span>{success}</span>
        </div>
      )}

      {/* Join + filter toolbar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div className="card-elevated">
          <div className="card-header">JOIN ACTIVITY</div>
          <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <select value={joinActivityId} onChange={(e) => setJoinActivityId(e.target.value)} style={selectStyle} disabled={joining}>
              <option value="">// select CSR activity</option>
              {joinable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} · {a.points_awarded}pts · {a.status}
                </option>
              ))}
            </select>
            <button type="submit" className={`btn btn-primary btn-md btn-cli${joining ? " btn-loading" : ""}`} disabled={joining || !joinActivityId}>
              {joining ? "JOINING" : "JOIN"}
            </button>
          </form>
        </div>

        <div className="card-elevated">
          <div className="card-header">FILTER STATUS</div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {["all", "pending", "approved", "rejected"].map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${statusFilter === s ? "chip-green" : "chip-muted"}`}
                onClick={() => setStatusFilter(s)}
                style={{ cursor: "pointer" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: submitId ? "1fr minmax(280px, 360px)" : "1fr", gap: "var(--space-6)" }}>
        <div>
          <div className="card-header">PARTICIPATION LEDGER</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>LOADING...</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
              // No participation records found.
            </div>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                    {["ID", "EMPLOYEE", "ACTIVITY", "STATUS", "PROOF", "PTS", "ACTION"].map((h) => (
                      <th key={h} style={{ textAlign: h === "ACTION" ? "center" : "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
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
                            $ proof
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
                  <span className="input-prompt">&gt;</span>
                  <input id="rej" className="form-input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="optional reason used on reject" />
                </div>
              </div>
            </div>
          )}
        </div>

        {submitId && (
          <div className="card-elevated" style={{ height: "fit-content" }}>
            <div className="card-header">SUBMIT PROOF #{submitId}</div>
            <form onSubmit={handleSubmitProof}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="cd">COMPLETION DATE</label>
                  <input id="cd" type="date" className="form-input" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} disabled={submitting} style={{ paddingLeft: "12px" }} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pu">PROOF URL / LINK</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="pu" className="form-input" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." disabled={submitting} />
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginTop: "4px" }}>
                    // Stored as attachment record for approval audit
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button type="submit" className={`btn btn-primary btn-md btn-cli btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                    {submitting ? "SUBMITTING" : "SUBMIT"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-md btn-full" onClick={() => setSubmitId(null)} disabled={submitting}>
                    CANCEL
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
