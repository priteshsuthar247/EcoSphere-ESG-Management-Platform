"use client";
// src/app/dashboard/environmental/goals/page.tsx
// Environmental Goals

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

interface Goal {
  id: number;
  name: string;
  department_id: number | null;
  department_name: string | null;
  target_value: number;
  current_value: number;
  baseline_value: number | null;
  unit: string;
  deadline: string;
  progress_percent: number;
  status: string;
  description: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  completed: number;
  avg_progress: number;
}

interface Department {
  id: number;
  name: string;
}

const emptyForm = {
  name: "",
  department_id: "",
  target_value: "",
  current_value: "",
  baseline_value: "",
  unit: "kgCO2e",
  deadline: "",
  status: "active",
  description: "",
};

export default function EnvironmentalGoalsPage() {
  const [items, setItems] = useState<Goal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { draft, setSearch, setStatus, apply, queryString } = useListQuery();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [progressDraft, setProgressDraft] = useState<Record<number, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(queryString);
      params.set("meta", "1");
      const res = await fetch(`/api/environmental/goals?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load goals");
      setItems(json.data.items);
      setStats(json.data.stats);
      setDepartments(json.data.departments ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

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

  function openEdit(goal: Goal) {
    setEditingId(goal.id);
    setForm({
      name: goal.name,
      department_id: goal.department_id === null ? "" : String(goal.department_id),
      target_value: String(goal.target_value),
      current_value: String(goal.current_value),
      baseline_value: goal.baseline_value === null ? "" : String(goal.baseline_value),
      unit: goal.unit,
      deadline: String(goal.deadline).slice(0, 10),
      status: goal.status,
      description: goal.description ?? "",
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name,
      department_id: form.department_id || null,
      target_value: Number(form.target_value),
      current_value: form.current_value === "" ? undefined : Number(form.current_value),
      baseline_value: form.baseline_value === "" ? null : Number(form.baseline_value),
      unit: form.unit,
      deadline: form.deadline,
      status: form.status,
      description: form.description || null,
    };

    try {
      const res = await fetch("/api/environmental/goals", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      setSuccess(editingId ? "Goal updated." : "Goal created.");
      setShowForm(false);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateProgress(goalId: number) {
    const raw = progressDraft[goalId];
    if (raw === undefined || raw === "") return;
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      setError("Progress value must be a number");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/environmental/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goalId, current_value: value }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Progress update failed");
      setSuccess(`Goal #${goalId} progress updated.`);
      setProgressDraft((prev) => {
        const next = { ...prev };
        delete next[goalId];
        return next;
      });
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function statusChip(status: string) {
    if (status === "completed") return "chip-green";
    if (status === "at_risk") return "chip-amber";
    if (status === "active") return "chip-cyan";
    return "chip-muted";
  }

  function progressColor(pct: number) {
    if (pct >= 100) return "var(--color-primary)";
    if (pct >= 50) return "var(--color-tertiary)";
    if (pct >= 25) return "var(--color-secondary)";
    return "var(--color-error)";
  }

    return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          ENVIRONMENTAL GOALS
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Define sustainability targets, track progress, and monitor deadlines.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>TOTAL</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-primary)" }}>{stats?.total ?? "–"}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>ACTIVE</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-tertiary)" }}>{stats?.active ?? "–"}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>COMPLETED</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-primary)" }}>{stats?.completed ?? "–"}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>AVG PROGRESS</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-secondary)" }}>
            {stats ? `${stats.avg_progress}%` : "–"}
          </div>
        </div>
      </div>

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {success && <AlertBanner type="success">{success}</AlertBanner>}

      <TableFilters
        search={draft.search}
        onSearchChange={setSearch}
        searchPlaceholder="Search goals, department, unit…"
        status={draft.status}
        onStatusChange={setStatus}
        statusOptions={[
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "at_risk", label: "At risk" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
          { value: "archived", label: "Archived" },
        ]}
            
      onApply={apply}

      applying={loading}

      />
          <ToolbarActions>
            <button type="button" className="btn btn-primary btn-md" onClick={openCreate}>
            New goal
          </button>
          </ToolbarActions>
      <div>
        <div className="card-header">Goal registry</div>
        {loading ? (
          <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
            <span className="spinner" />
            <span style={{ marginLeft: "var(--space-3)" }}>Loading goals…</span>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", textAlign: "center" }}>
            No environmental goals found. Create a sustainability target to begin.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {items.map((goal) => (
              <div
                key={goal.id}
                style={{
                  border: "1px solid var(--color-border-subtle)",
                  padding: "var(--space-4)",
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)" }}>
                      ID {String(goal.id).padStart(3, "0")}
                      {goal.department_name ? ` · ${goal.department_name}` : " · org-wide"}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: 700, color: "var(--color-primary)" }}>
                      {goal.name}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                    <span className={`chip ${statusChip(goal.status)}`}>{goal.status}</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(goal)}>Edit</button>
                  </div>
                </div>

                {goal.description && (
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
                    {goal.description}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-3)", fontSize: "12px" }}>
                  <div>
                    <div style={{ color: "var(--color-text-dim)" }}>Current</div>
                    <div style={{ color: "var(--color-text-primary)" }}>{Number(goal.current_value).toFixed(2)} {goal.unit}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--color-text-dim)" }}>Target</div>
                    <div style={{ color: "var(--color-tertiary)" }}>{Number(goal.target_value).toFixed(2)} {goal.unit}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--color-text-dim)" }}>Baseline</div>
                    <div style={{ color: "var(--color-text-muted)" }}>
                      {goal.baseline_value === null ? "—" : `${Number(goal.baseline_value).toFixed(2)} ${goal.unit}`}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--color-text-dim)" }}>Deadline</div>
                    <div style={{ color: "var(--color-secondary)" }}>{String(goal.deadline).slice(0, 10)}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "var(--space-3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: "var(--color-text-dim)" }}>Progress</span>
                    <span style={{ color: progressColor(Number(goal.progress_percent)) }}>
                      {Number(goal.progress_percent).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: "8px", border: "1px solid var(--color-border-medium)", background: "var(--color-bg)" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, Math.max(0, Number(goal.progress_percent)))}%`,
                        background: progressColor(Number(goal.progress_percent)),
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>Update current:</span>
                  <input
                    className="form-input"
                    style={{ width: "120px", height: "32px" }}
                    type="number"
                    step="any"
                    placeholder={String(goal.current_value)}
                    value={progressDraft[goal.id] ?? ""}
                    onChange={(e) => setProgressDraft({ ...progressDraft, [goal.id]: e.target.value })}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateProgress(goal.id)}>
                    Set
                  </button>
                  {goal.created_by_name && (
                    <span style={{ fontSize: "11px", color: "var(--color-text-dim)", marginLeft: "auto" }}>
                      by {goal.created_by_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        title={editingId ? `Edit goal #${editingId}` : "New environmental goal"}
        onClose={() => { if (!submitting) { setShowForm(false); setEditingId(null); } }}
        width={640}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label required" htmlFor="g-name">Name</label>
              <input id="g-name" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="g-dept">Department</label>
              <select id="g-dept" className="form-input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} disabled={submitting}>
                <option value="">Organisation-wide</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="form-group">
                <label className="form-label required" htmlFor="g-target">Target</label>
                <input id="g-target" className="form-input" type="number" step="any" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} required disabled={submitting} />
              </div>
              <div className="form-group">
                <label className="form-label required" htmlFor="g-unit">Unit</label>
                <input id="g-unit" className="form-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required disabled={submitting} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="g-current">Current</label>
                <input id="g-current" className="form-input" type="number" step="any" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} disabled={submitting} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="g-base">Baseline</label>
                <input id="g-base" className="form-input" type="number" step="any" value={form.baseline_value} onChange={(e) => setForm({ ...form, baseline_value: e.target.value })} disabled={submitting} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="g-deadline">Deadline</label>
              <input id="g-deadline" type="date" className="form-input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="g-status">Status</label>
              <select id="g-status" className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={submitting}>
                <option value="active">Active</option>
                <option value="at_risk">At risk</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="g-desc">Description</label>
              <input id="g-desc" className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={submitting} />
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
              <button type="submit" className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Save changes" : "Create goal"}
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
