"use client";
// src/app/dashboard/gamification/participation/page.tsx
// Challenge Participation approvals - managers only (employees redirected by middleware)

import { useState, useEffect } from "react";
import { useSessionRole } from "@/components/useSessionRole";
import TableFilters, { matchesSearch, matchesStatus } from "@/components/TableFilters";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchParticipations();
  }, []);

  async function fetchParticipations() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gamification/participation");
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
  }

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

      {error && (
        <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="msg msg-success" style={{ marginBottom: "var(--space-4)" }}>
          <span>{success}</span>
        </div>
      )}

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
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search employee, challenge…"
            status={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
          <div className="card-header">Participation verification records</div>
          
          <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-medium)", background: "var(--color-surface)" }}>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ID</th>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Employee</th>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Challenge</th>
                  <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Reward</th>
                  <th style={{ textAlign: "right", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Progress</th>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Submit date</th>
                  <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Status</th>
                  <th style={{ textAlign: "center", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {participations.filter((p) => matchesStatus(statusFilter, p.approval_status) && matchesSearch(search, [p.id, p.user_name, p.user_email, p.challenge_title])).length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                      No participations logged for review.
                    </td>
                  </tr>
                ) : (
                  participations.filter((p) => matchesStatus(statusFilter, p.approval_status) && matchesSearch(search, [p.id, p.user_name, p.user_email, p.challenge_title])).map((p) => (
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
