"use client";
// src/app/dashboard/social/csr/page.tsx
// CSR Activities — TerminalUI

import { useCallback, useEffect, useState } from "react";

interface CsrActivity {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  scheduled_date: string | null;
  location: string | null;
  max_participants: number | null;
  evidence_required: number;
  points_awarded: number;
  status: string;
  created_by_name: string | null;
  participant_count: number;
  approved_count: number;
  pending_count: number;
}

interface Category {
  id: number;
  name: string;
}

interface Stats {
  total: number;
  upcoming: number;
  active: number;
  completed: number;
  total_participants: number;
}

const emptyForm = {
  title: "",
  description: "",
  category_id: "",
  scheduled_date: "",
  location: "",
  max_participants: "",
  evidence_required: true,
  points_awarded: "50",
  status: "upcoming",
};

export default function CsrActivitiesPage() {
  const [items, setItems] = useState<CsrActivity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [viewerId, setViewerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ meta: "1", status: statusFilter });
      const res = await fetch(`/api/social/csr-activities?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load CSR activities");
      setItems(json.data.items);
      setStats(json.data.stats);
      setCategories(json.data.categories ?? []);
      setCanManage(Boolean(json.data.viewer?.canManage));
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

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEdit(item: CsrActivity) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description ?? "",
      category_id: item.category_id === null ? "" : String(item.category_id),
      scheduled_date: item.scheduled_date ? String(item.scheduled_date).slice(0, 10) : "",
      location: item.location ?? "",
      max_participants: item.max_participants === null ? "" : String(item.max_participants),
      evidence_required: Boolean(item.evidence_required),
      points_awarded: String(item.points_awarded),
      status: item.status,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    const payload = {
      title: form.title,
      description: form.description || null,
      category_id: form.category_id || null,
      scheduled_date: form.scheduled_date || null,
      location: form.location || null,
      max_participants: form.max_participants === "" ? null : Number(form.max_participants),
      evidence_required: form.evidence_required,
      points_awarded: Number(form.points_awarded),
      status: form.status,
    };
    try {
      const res = await fetch("/api/social/csr-activities", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      setSuccess(editingId ? "CSR activity updated." : "CSR activity created.");
      setShowForm(false);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(activityId: number) {
    setJoiningId(activityId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/social/participations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", activity_id: activityId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Join failed");
      setSuccess("Joined activity. Submit proof under Employee Participation.");
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoiningId(null);
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
    if (status === "active") return "chip-green";
    if (status === "upcoming") return "chip-cyan";
    if (status === "completed") return "chip-amber";
    return "chip-muted";
  }

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # SOCIAL / CSR-ACTIVITIES
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          CSR ACTIVITIES
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Organise social initiatives and enable employees to join and earn ESG points.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "TOTAL", value: stats?.total, color: "var(--color-primary)" },
          { label: "UPCOMING", value: stats?.upcoming, color: "var(--color-tertiary)" },
          { label: "ACTIVE", value: stats?.active, color: "var(--color-primary)" },
          { label: "COMPLETED", value: stats?.completed, color: "var(--color-secondary)" },
          { label: "PARTICIPANTS", value: stats?.total_participants, color: "var(--color-tertiary)" },
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

      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-4)", alignItems: "center" }}>
        {canManage && (
          <button type="button" className="btn btn-primary btn-md btn-cli" onClick={openCreate}>
            NEW ACTIVITY
          </button>
        )}
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-dim)" }}>// STATUS</span>
          {["all", "upcoming", "active", "completed", "cancelled"].map((s) => (
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

      <div style={{ display: "grid", gridTemplateColumns: showForm ? "1fr minmax(300px, 380px)" : "1fr", gap: "var(--space-6)" }}>
        <div>
          <div className="card-header">ACTIVITY REGISTRY</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>LOADING ACTIVITIES...</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
              // No CSR activities found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid var(--color-border-subtle)",
                    padding: "var(--space-4)",
                    background: editingId === item.id ? "rgba(0, 255, 65, 0.04)" : "var(--color-surface)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)" }}>
                        #{String(item.id).padStart(3, "0")}
                        {item.category_name ? ` · ${item.category_name}` : ""}
                        {item.scheduled_date ? ` · ${String(item.scheduled_date).slice(0, 10)}` : ""}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: 700, color: "var(--color-primary)" }}>
                        {item.title}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                      <span className={`chip ${statusChip(item.status)}`}>{item.status}</span>
                      <span className="chip chip-amber">{item.points_awarded} pts</span>
                      {canManage && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>$ edit</button>
                      )}
                      {!["cancelled", "archived"].includes(item.status) && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm btn-cli"
                          disabled={joiningId === item.id}
                          onClick={() => handleJoin(item.id)}
                        >
                          {joiningId === item.id ? "JOINING" : "JOIN"}
                        </button>
                      )}
                    </div>
                  </div>

                  {item.description && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                      {item.description}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-3)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                    <div>
                      <div style={{ color: "var(--color-text-dim)" }}>// LOCATION</div>
                      <div style={{ color: "var(--color-text-primary)" }}>{item.location || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-dim)" }}>// PARTICIPANTS</div>
                      <div style={{ color: "var(--color-tertiary)" }}>
                        {item.participant_count}
                        {item.max_participants !== null ? ` / ${item.max_participants}` : ""}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-dim)" }}>// PENDING</div>
                      <div style={{ color: "var(--color-secondary)" }}>{item.pending_count}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-dim)" }}>// APPROVED</div>
                      <div style={{ color: "var(--color-primary)" }}>{item.approved_count}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-dim)" }}>// EVIDENCE</div>
                      <div style={{ color: "var(--color-text-muted)" }}>{item.evidence_required ? "required" : "optional"}</div>
                    </div>
                    {item.created_by_name && (
                      <div>
                        <div style={{ color: "var(--color-text-dim)" }}>// CREATED BY</div>
                        <div style={{ color: "var(--color-text-muted)" }}>{item.created_by_name}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && canManage && (
          <div className="card-elevated" style={{ height: "fit-content" }}>
            <div className="card-header">{editingId ? `EDIT ACTIVITY #${editingId}` : "NEW CSR ACTIVITY"}</div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="csr-title">TITLE</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="csr-title" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="csr-desc">DESCRIPTION</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="csr-desc" className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="csr-cat">CATEGORY</label>
                  <select id="csr-cat" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="">// none</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginTop: "4px" }}>
                      // Create CSR categories under Settings → Categories
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="csr-date">DATE</label>
                    <input id="csr-date" type="date" className="form-input" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} disabled={submitting} style={{ paddingLeft: "12px" }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="csr-pts">POINTS</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input id="csr-pts" className="form-input" type="number" min="0" step="1" value={form.points_awarded} onChange={(e) => setForm({ ...form, points_awarded: e.target.value })} required disabled={submitting} />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="csr-loc">LOCATION</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="csr-loc" className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="csr-max">MAX PARTICIPANTS</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="csr-max" className="form-input" type="number" min="1" step="1" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} disabled={submitting} placeholder="unlimited" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="csr-status">STATUS</label>
                  <select id="csr-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={selectStyle} disabled={submitting}>
                    {["upcoming", "active", "completed", "cancelled", "archived"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <label style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.evidence_required}
                    onChange={(e) => setForm({ ...form, evidence_required: e.target.checked })}
                    disabled={submitting}
                  />
                  [x] evidence required for approval
                </label>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button type="submit" className={`btn btn-primary btn-md btn-cli btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                    {submitting ? "SAVING" : "COMMIT"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-md btn-full" onClick={() => { setShowForm(false); setEditingId(null); }} disabled={submitting}>
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
