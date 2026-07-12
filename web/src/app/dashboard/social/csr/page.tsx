"use client";
// src/app/dashboard/social/csr/page.tsx
// CSR Activities

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import TableFilters, { matchesSearch, matchesStatus } from "@/components/TableFilters";

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
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
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
      const [res, partRes] = await Promise.all([
        fetch(`/api/social/csr-activities?${params}`),
        fetch("/api/social/participations?meta=1"),
      ]);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load CSR activities");
      setItems(json.data.items);
      setStats(json.data.stats);
      setCategories(json.data.categories ?? []);
      setCanManage(Boolean(json.data.viewer?.canManage));
      const vid = json.data.viewer?.id ?? null;
      setViewerId(vid);

      // Track activities this user already joined so Join is hidden
      if (partRes.ok) {
        const pj = await partRes.json();
        if (pj.success && Array.isArray(pj.data?.items)) {
          const mine = pj.data.items.filter(
            (p: { user_id: number; csr_activity_id: number }) =>
              vid == null || p.user_id === vid,
          );
          setJoinedIds(new Set(mine.map((p: { csr_activity_id: number }) => p.csr_activity_id)));
        }
      }
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

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          matchesStatus(statusFilter, item.status) &&
          matchesSearch(search, [item.id, item.title, item.description, item.location, item.category_name]),
      ),
    [items, statusFilter, search],
  );

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
          CSR activities
        </h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
          Organise social initiatives and enable employees to join and earn ESG points.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "Total", value: stats?.total, color: "var(--color-primary)" },
          { label: "Upcoming", value: stats?.upcoming, color: "var(--color-tertiary)" },
          { label: "Active", value: stats?.active, color: "var(--color-primary)" },
          { label: "Completed", value: stats?.completed, color: "var(--color-secondary)" },
          { label: "Participants", value: stats?.total_participants, color: "var(--color-tertiary)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: "12px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>{s.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value ?? "–"}</div>
          </div>
        ))}
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

      <TableFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title, location, category…"
        status={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[
          { value: "all", label: "All statuses" },
          { value: "upcoming", label: "Upcoming" },
          { value: "active", label: "Active" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
          { value: "archived", label: "Archived" },
        ]}
        extra={
          canManage ? (
            <button type="button" className="btn btn-primary btn-md" onClick={openCreate}>
              New activity
            </button>
          ) : null
        }
      />

      <div>
          <div className="card-header">Activity registry ({filteredItems.length})</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)" }}>Loading activities…</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", textAlign: "center" }}>
              No CSR activities found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid var(--color-border-subtle)",
                    padding: "var(--space-4)",
                    background: "var(--color-surface)",
                    borderRadius: "var(--radius-lg)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)" }}>
                        ID {String(item.id).padStart(3, "0")}
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
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>Edit</button>
                      )}
                      {!["cancelled", "archived"].includes(item.status) &&
                        !joinedIds.has(item.id) && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={joiningId === item.id}
                          onClick={() => handleJoin(item.id)}
                        >
                          {joiningId === item.id ? "Joining…" : "Join"}
                        </button>
                      )}
                      {joinedIds.has(item.id) && (
                        <span className="chip chip-green">Joined</span>
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
                      <div style={{ color: "var(--color-text-dim)" }}>Location</div>
                      <div style={{ color: "var(--color-text-primary)" }}>{item.location || "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-dim)" }}>Participants</div>
                      <div style={{ color: "var(--color-tertiary)" }}>
                        {item.participant_count}
                        {item.max_participants !== null ? ` / ${item.max_participants}` : ""}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-dim)" }}>Pending</div>
                      <div style={{ color: "var(--color-secondary)" }}>{item.pending_count}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-dim)" }}>Approved</div>
                      <div style={{ color: "var(--color-primary)" }}>{item.approved_count}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-dim)" }}>Evidence</div>
                      <div style={{ color: "var(--color-text-muted)" }}>{item.evidence_required ? "required" : "optional"}</div>
                    </div>
                    {item.created_by_name && (
                      <div>
                        <div style={{ color: "var(--color-text-dim)" }}>Created by</div>
                        <div style={{ color: "var(--color-text-muted)" }}>{item.created_by_name}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      <Modal
        open={showForm && canManage}
        title={editingId ? `Edit activity ${editingId}` : "New CSR activity"}
        onClose={() => { if (!submitting) { setShowForm(false); setEditingId(null); } }}
        width={640}
      >
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label required" htmlFor="csr-title">Title</label>
                  <input id="csr-title" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="csr-desc">Description</label>
                  <input id="csr-desc" className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="csr-cat">Category</label>
                  <select id="csr-cat" className="form-input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} disabled={submitting}>
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="csr-date">Date</label>
                    <input id="csr-date" type="date" className="form-input" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} disabled={submitting} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required" htmlFor="csr-pts">Points</label>
                    <input id="csr-pts" className="form-input" type="number" min="0" step="1" value={form.points_awarded} onChange={(e) => setForm({ ...form, points_awarded: e.target.value })} required disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="csr-loc">Location</label>
                  <input id="csr-loc" className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="csr-max">Max participants</label>
                  <input id="csr-max" className="form-input" type="number" min="1" step="1" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} disabled={submitting} placeholder="unlimited" />
                </div>
                <div className="form-group">
                  <label className="form-label required" htmlFor="csr-status">Status</label>
                  <select id="csr-status" className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={submitting}>
                    {["upcoming", "active", "completed", "cancelled", "archived"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <label className="form-check">
                  <input
                    type="checkbox"
                    checked={form.evidence_required}
                    onChange={(e) => setForm({ ...form, evidence_required: e.target.checked })}
                    disabled={submitting}
                  />
                  Evidence required for approval
                </label>
                <div style={{ display: "flex", gap: "var(--space-3)", marginTop: 8 }}>
                  <button type="submit" className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                    {submitting ? "Saving…" : editingId ? "Save changes" : "Create activity"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-md btn-full" onClick={() => { setShowForm(false); setEditingId(null); }} disabled={submitting}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
      </Modal>
    </div>
  );
}
