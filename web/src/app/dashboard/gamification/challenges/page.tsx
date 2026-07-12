"use client";
// src/app/dashboard/gamification/challenges/page.tsx
// Challenges panel - TerminalUI design system
// Admin: full CRUD. Employees/others: view active challenges only.

import { useState, useEffect } from "react";
import { useSessionRole } from "@/components/useSessionRole";
import Modal from "@/components/Modal";
import TableFilters, { matchesSearch, matchesStatus } from "@/components/TableFilters";

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  xp_reward: number;
  difficulty: string;
  evidence_required: number;
  start_date: string | null;
  end_date: string;
  status: string;
  max_participants: number | null;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

export default function ChallengesManagementPage() {
  const { isAdmin, loading: roleLoading } = useSessionRole();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form parameters
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("null");
  const [formXpReward, setFormXpReward] = useState("100");
  const [formDifficulty, setFormDifficulty] = useState("medium");
  const [formEvidenceRequired, setFormEvidenceRequired] = useState(true);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [formMaxParticipants, setFormMaxParticipants] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!roleLoading) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLoading, isAdmin]);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const challengesRes = await fetch("/api/gamification/challenges");
      const challengesJson = await challengesRes.json();

      if (!challengesRes.ok || !challengesJson.success) {
        throw new Error(challengesJson.error || "Failed to load challenges");
      }

      setChallenges(challengesJson.data);

      // Categories only needed for admin create/edit form
      if (isAdmin) {
        const categoriesRes = await fetch("/api/admin/categories");
        const categoriesJson = await categoriesRes.json();
        if (categoriesRes.ok && categoriesJson.success) {
          const challengeCats = (categoriesJson.data as Category[]).filter(
            (c) => c.type === "challenge",
          );
          setCategories(challengeCats);
        }
      } else {
        setCategories([]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleAddClick() {
    setIsAdding(true);
    setEditingChallenge(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategoryId("null");
    setFormXpReward("100");
    setFormDifficulty("medium");
    setFormEvidenceRequired(true);
    setFormStartDate("");
    setFormEndDate("");
    setFormStatus("draft");
    setFormMaxParticipants("");
    setError("");
    setSuccess("");
  }

  function handleEditClick(c: Challenge) {
    setIsAdding(false);
    setEditingChallenge(c);
    setFormTitle(c.title);
    setFormDescription(c.description || "");
    setFormCategoryId(c.category_id === null ? "null" : String(c.category_id));
    setFormXpReward(String(c.xp_reward));
    setFormDifficulty(c.difficulty);
    setFormEvidenceRequired(c.evidence_required === 1);
    setFormStartDate(c.start_date ? c.start_date.split("T")[0] : "");
    setFormEndDate(c.end_date ? c.end_date.split("T")[0] : "");
    setFormStatus(c.status);
    setFormMaxParticipants(c.max_participants === null ? "" : String(c.max_participants));
    setError("");
    setSuccess("");
  }

  function closePanel() {
    setIsAdding(false);
    setEditingChallenge(null);
    setError("");
  }

  async function handleJoin(challengeId: number) {
    setJoiningId(challengeId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/gamification/participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", challenge_id: challengeId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Could not join challenge");
      setSuccess("Joined challenge. Submit proof from Challenge Approvals (managers) or contact your lead.");
      // Employee can also submit immediately after join via submit action
      await fetch("/api/gamification/participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          id: json.data.id,
          progress_percent: 100,
        }),
      }).catch(() => {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoiningId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      id: editingChallenge?.id,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      categoryId: formCategoryId === "null" ? null : parseInt(formCategoryId, 10),
      xpReward: parseInt(formXpReward, 10),
      difficulty: formDifficulty,
      evidenceRequired: formEvidenceRequired,
      startDate: formStartDate || null,
      endDate: formEndDate,
      status: formStatus,
      maxParticipants: formMaxParticipants ? parseInt(formMaxParticipants, 10) : null
    };

    try {
      const url = "/api/gamification/challenges";
      const method = editingChallenge ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to commit challenge details");
      }

      setSuccess(editingChallenge ? "Challenge details updated." : "New challenge registered successfully.");
      setIsAdding(false);
      setEditingChallenge(null);
      fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const visible = challenges.filter((c) => isAdmin || c.status === "active" || c.status === "under_review" || c.status === "completed");
  const filtered = visible.filter(
    (c) =>
      matchesStatus(statusFilter, c.status) &&
      matchesSearch(search, [c.id, c.title, c.category_name, c.difficulty, c.description]),
  );
  const formOpen = isAdmin && (isAdding || editingChallenge !== null);

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          SUSTAINABILITY CHALLENGES
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          {isAdmin
            ? "Configure employee sustainability goals and rewards lifecycle (Draft → Active → Under Review → Completed → Archived)."
            : "Browse active sustainability challenges and track XP rewards."}
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

      {loading || roleLoading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)" }}>Loading challenges…</span>
        </div>
      ) : (
        <>
          <TableFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search challenges, category…"
            status={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={[
              { value: "all", label: "All statuses" },
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "under_review", label: "Under review" },
              { value: "completed", label: "Completed" },
              { value: "archived", label: "Archived" },
            ]}
            extra={
              isAdmin ? (
                <button type="button" onClick={handleAddClick} className="btn btn-primary btn-md">
                  New challenge
                </button>
              ) : null
            }
          />

          <div>
            <div className="card-header">Challenges ledger</div>
            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border-medium)", background: "var(--color-surface)" }}>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ID</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Title</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Category</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Reward (XP)</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Difficulty</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Evidence</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Deadline</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Status</th>
                    <th style={{ textAlign: "center", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                        No challenges found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(c.id).padStart(3, "0")}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)", fontWeight: 500 }}>{c.title}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                          {c.category_name || "—"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-primary)" }}>{c.xp_reward} XP</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${c.difficulty === "easy" ? "chip-green" : c.difficulty === "medium" ? "chip-cyan" : "chip-amber"}`}>
                            {c.difficulty}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>
                          {c.evidence_required === 1 ? "Required" : "Optional"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                          {c.end_date ? c.end_date.split("T")[0] : "–"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${c.status === "active" ? "chip-green" : c.status === "draft" ? "chip-muted" : c.status === "under_review" ? "chip-cyan" : c.status === "completed" ? "chip-cyan" : "chip-red"}`}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", textAlign: "center", whiteSpace: "nowrap" }}>
                          {isAdmin && (
                            <button type="button" onClick={() => handleEditClick(c)} className="btn btn-secondary btn-sm" style={{ marginRight: 6 }}>
                              Edit
                            </button>
                          )}
                          {c.status === "active" && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={joiningId === c.id}
                              onClick={() => handleJoin(c.id)}
                            >
                              {joiningId === c.id ? "Joining…" : "Join"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Modal
            open={formOpen}
            title={isAdding ? "New challenge" : `Edit challenge #${editingChallenge?.id ?? ""}`}
            onClose={() => { if (!submitting) closePanel(); }}
            width={640}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label required">Challenge title</label>
                  <input type="text" className="form-input" placeholder="e.g. Ride to Work Week" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)} disabled={submitting}>
                    <option value="null">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">XP / points reward</label>
                  <input type="number" className="form-input" value={formXpReward} onChange={(e) => setFormXpReward(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select className="form-input" value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)} disabled={submitting}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Max participants</label>
                  <input type="number" className="form-input" placeholder="Leave blank for unlimited" value={formMaxParticipants} onChange={(e) => setFormMaxParticipants(e.target.value)} disabled={submitting} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label">Start date</label>
                    <input type="date" className="form-input" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} disabled={submitting} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">End date</label>
                    <input type="date" className="form-input" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} required disabled={submitting} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", fontSize: "13px" }}>
                    <input type="checkbox" checked={formEvidenceRequired} onChange={(e) => setFormEvidenceRequired(e.target.checked)} disabled={submitting} />
                    Evidence required for submission
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Lifecycle status</label>
                  <select className="form-input" value={formStatus} onChange={(e) => setFormStatus(e.target.value)} disabled={submitting}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="under_review">Under review</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-input" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} disabled={submitting} />
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button type="submit" disabled={submitting || !formTitle || !formEndDate} className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`}>
                    {submitting ? "Saving…" : editingChallenge ? "Save changes" : "Create challenge"}
                  </button>
                  <button type="button" onClick={closePanel} className="btn btn-ghost btn-md btn-full" disabled={submitting}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
