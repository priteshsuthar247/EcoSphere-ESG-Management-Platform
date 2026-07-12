"use client";
// src/app/dashboard/gamification/challenges/page.tsx
// Challenges Management panel - TerminalUI design system

import { useState, useEffect } from "react";

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
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Drawer status
  const [isAdding, setIsAdding] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

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
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [challengesRes, categoriesRes] = await Promise.all([
        fetch("/api/gamification/challenges"),
        fetch("/api/admin/categories")
      ]);

      const challengesJson = await challengesRes.json();
      const categoriesJson = await categoriesRes.json();

      if (!challengesRes.ok || !challengesJson.success) {
        throw new Error(challengesJson.error || "Failed to load challenges");
      }
      if (!categoriesRes.ok || !categoriesJson.success) {
        throw new Error(categoriesJson.error || "Failed to load categories");
      }

      setChallenges(challengesJson.data);
      // Filter categories to only show challenge-related classification categories
      const challengeCats = categoriesJson.data.filter((c: Category) => c.type === "challenge");
      setCategories(challengeCats);
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # ADMIN / GAMIFICATION / CHALLENGES
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          SUSTAINABILITY CHALLENGES
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Configure employee sustainability goals and rewards lifecycle (Draft → Active → Under Review → Completed → Archived).
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {error && (
        <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
          <span>[ERR]</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="msg msg-success" style={{ marginBottom: "var(--space-4)" }}>
          <span>[OK]</span>
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>
            RETRIEVING CHALLENGES DATA...
          </span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: (isAdding || editingChallenge) ? "1fr 360px" : "1fr", gap: "var(--space-6)" }}>
          
          {/* ── LIST VIEW ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <div className="card-header" style={{ marginBottom: 0 }}>ACTIVE CHALLENGES LEDGER</div>
              {!isAdding && !editingChallenge && (
                <button onClick={handleAddClick} className="btn btn-primary btn-sm btn-cli">
                  NEW CHALLENGE
                </button>
              )}
            </div>

            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ID</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>TITLE</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>CATEGORY</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>REWARD (XP)</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>DIFFICULTY</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>EVIDENCE</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>DEADLINE</th>
                    <th style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>STATUS</th>
                    <th style={{ textAlign: "center", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {challenges.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-text-dim)" }}>
                        // NO CHALLENGES DISPATCHED IN DATABASE SYSTEM
                      </td>
                    </tr>
                  ) : (
                    challenges.map((c) => (
                      <tr 
                        key={c.id} 
                        style={{ 
                          borderBottom: "1px solid var(--color-border-subtle)", 
                          background: editingChallenge?.id === c.id ? "rgba(0, 255, 65, 0.04)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(c.id).padStart(3, "0")}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)", fontWeight: 500 }}>{c.title}</td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                          {c.category_name ? `> ${c.category_name}` : "// NONE"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-primary)" }}>{c.xp_reward} XP</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${c.difficulty === "easy" ? "chip-green" : c.difficulty === "medium" ? "chip-cyan" : "chip-amber"}`}>
                            {c.difficulty.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>
                          {c.evidence_required === 1 ? "[x] REQ" : "[ ] OPT"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                          {c.end_date ? c.end_date.split("T")[0] : "–"}
                        </td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className={`chip ${c.status === "active" ? "chip-green" : c.status === "draft" ? "chip-muted" : c.status === "under_review" ? "chip-cyan" : c.status === "completed" ? "chip-cyan" : "chip-red"}`}>
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", textAlign: "center" }}>
                          <button 
                            onClick={() => handleEditClick(c)} 
                            className="btn btn-secondary btn-sm"
                          >
                            $ edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── CREATE / EDIT PANEL ── */}
          {(isAdding || editingChallenge) && (
            <div className="card-elevated" style={{ height: "fit-content" }}>
              <div className="card-header">
                {isAdding ? "INITIALIZE CHALLENGE" : `CONFIGURE CH: ${editingChallenge?.id}`}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  
                  {/* Title field */}
                  <div className="form-group">
                    <label className="form-label">CHALLENGE TITLE</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Ride to Work Week"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Category selection */}
                  <div className="form-group">
                    <label className="form-label">CLASSIFICATION CATEGORY</label>
                    <div>
                      <select 
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: "var(--color-bg)",
                          border: "1px solid var(--color-border-medium)",
                          color: "var(--color-primary)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "14px",
                          outline: "none",
                          borderRadius: "0px"
                        }}
                        disabled={submitting}
                      >
                        <option value="null">// NO CATEGORY ASSIGNED</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            &gt; {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* XP Reward field */}
                  <div className="form-group">
                    <label className="form-label">XP / POINTS REWARD</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="number" 
                        className="form-input"
                        placeholder="e.g. 150"
                        value={formXpReward}
                        onChange={(e) => setFormXpReward(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Difficulty field */}
                  <div className="form-group">
                    <label className="form-label">DIFFICULTY LEVEL</label>
                    <div>
                      <select 
                        value={formDifficulty}
                        onChange={(e) => setFormDifficulty(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: "var(--color-bg)",
                          border: "1px solid var(--color-border-medium)",
                          color: "var(--color-primary)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "14px",
                          outline: "none",
                          borderRadius: "0px"
                        }}
                        disabled={submitting}
                      >
                        <option value="easy">EASY</option>
                        <option value="medium">MEDIUM</option>
                        <option value="hard">HARD</option>
                      </select>
                    </div>
                  </div>

                  {/* Max Participants field */}
                  <div className="form-group">
                    <label className="form-label">MAX PARTICIPANTS</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="number" 
                        className="form-input"
                        placeholder="e.g. 50 (leave blank for unlimited)"
                        value={formMaxParticipants}
                        onChange={(e) => setFormMaxParticipants(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Start Date field */}
                  <div className="form-group">
                    <label className="form-label">STARTING DATE</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="date" 
                        className="form-input"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* End Date field */}
                  <div className="form-group">
                    <label className="form-label">DEADLINE / END DATE</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="date" 
                        className="form-input"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Evidence required checkbox */}
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => setFormEvidenceRequired(!formEvidenceRequired)}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        background: "transparent",
                        border: "none",
                        color: "var(--color-primary)",
                        cursor: "pointer"
                      }}
                      disabled={submitting}
                    >
                      {formEvidenceRequired ? "[x]" : "[ ]"} EVIDENCE REQUIRED FOR SUBMISSION
                    </button>
                  </div>

                  {/* Lifecycle status selection */}
                  <div className="form-group">
                    <label className="form-label">LIFECYCLE STATUS</label>
                    <div>
                      <select 
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: "var(--color-bg)",
                          border: "1px solid var(--color-border-medium)",
                          color: "var(--color-primary)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "14px",
                          outline: "none",
                          borderRadius: "0px"
                        }}
                        disabled={submitting}
                      >
                        <option value="draft">DRAFT</option>
                        <option value="active">ACTIVE</option>
                        <option value="under_review">UNDER REVIEW</option>
                        <option value="completed">COMPLETED</option>
                        <option value="archived">ARCHIVED</option>
                      </select>
                    </div>
                  </div>

                  {/* Description field */}
                  <div className="form-group">
                    <label className="form-label">CHALLENGE DESCRIPTION</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Reduce corporate carbon emissions by commuting via cycle."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div 
                    className="ascii-divider" 
                    style={{ color: "var(--color-border-subtle)", margin: "var(--space-2) 0" }}
                  >
                    {"─".repeat(24)}
                  </div>

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: "var(--space-3)" }}>
                    <button 
                      type="submit" 
                      disabled={submitting || !formTitle || !formEndDate}
                      className={`btn btn-primary btn-md btn-cli btn-full${submitting ? " btn-loading" : ""}`}
                    >
                      {submitting ? "COMMITTING" : "COMMIT"}
                    </button>
                    <button 
                      type="button" 
                      onClick={closePanel}
                      className="btn btn-ghost btn-md btn-full"
                      disabled={submitting}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
