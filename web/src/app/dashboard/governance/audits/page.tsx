"use client";
// Audits — TerminalUI

import { useCallback, useEffect, useState } from "react";

interface Audit {
  id: number;
  title: string;
  audit_type: string | null;
  department_id: number | null;
  department_name: string | null;
  auditor_user_id: number | null;
  auditor_name: string | null;
  external_auditor: string | null;
  start_date: string | null;
  end_date: string | null;
  findings_summary: string | null;
  num_issues: number;
  status: string;
  open_issues: number;
  created_by_name: string | null;
}

interface Stats {
  total: number;
  planned: number;
  in_progress: number;
  completed: number;
  under_review: number;
  total_open_issues: number;
}

const emptyForm = {
  title: "",
  audit_type: "internal",
  department_id: "",
  auditor_user_id: "",
  external_auditor: "",
  start_date: "",
  end_date: "",
  findings_summary: "",
  status: "planned",
};

export default function AuditsPage() {
  const [items, setItems] = useState<Audit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/governance/audits?meta=1&status=${statusFilter}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load audits");
      setItems(json.data.items);
      setStats(json.data.stats);
      setDepartments(json.data.departments ?? []);
      setUsers(json.data.users ?? []);
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
  }

  function openEdit(a: Audit) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      audit_type: a.audit_type ?? "internal",
      department_id: a.department_id === null ? "" : String(a.department_id),
      auditor_user_id: a.auditor_user_id === null ? "" : String(a.auditor_user_id),
      external_auditor: a.external_auditor ?? "",
      start_date: a.start_date ? String(a.start_date).slice(0, 10) : "",
      end_date: a.end_date ? String(a.end_date).slice(0, 10) : "",
      findings_summary: a.findings_summary ?? "",
      status: a.status,
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
      audit_type: form.audit_type || null,
      department_id: form.department_id || null,
      auditor_user_id: form.auditor_user_id || null,
      external_auditor: form.external_auditor || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      findings_summary: form.findings_summary || null,
      status: form.status,
    };
    try {
      const res = await fetch("/api/governance/audits", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      setSuccess(editingId ? "Audit updated." : "Audit created.");
      setShowForm(false);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
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

  function statusChip(s: string) {
    if (s === "in_progress") return "chip-cyan";
    if (s === "completed") return "chip-green";
    if (s === "under_review") return "chip-amber";
    return "chip-muted";
  }

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # GOVERNANCE / AUDITS
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          GOVERNANCE AUDITS
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Plan and track internal/external ESG audits and linked issues.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "TOTAL", value: stats?.total, color: "var(--color-primary)" },
          { label: "PLANNED", value: stats?.planned, color: "var(--color-text-muted)" },
          { label: "IN PROGRESS", value: stats?.in_progress, color: "var(--color-tertiary)" },
          { label: "UNDER REVIEW", value: stats?.under_review, color: "var(--color-secondary)" },
          { label: "COMPLETED", value: stats?.completed, color: "var(--color-primary)" },
          { label: "OPEN ISSUES", value: stats?.total_open_issues, color: "var(--color-error)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>// {s.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: s.color }}>{s.value ?? "–"}</div>
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
        <button type="button" className="btn btn-primary btn-md btn-cli" onClick={openCreate}>NEW AUDIT</button>
        {["all", "planned", "in_progress", "under_review", "completed"].map((s) => (
          <button key={s} type="button" className={`chip ${statusFilter === s ? "chip-green" : "chip-muted"}`} onClick={() => setStatusFilter(s)} style={{ cursor: "pointer" }}>{s}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showForm ? "1fr minmax(300px, 380px)" : "1fr", gap: "var(--space-6)" }}>
        <div>
          <div className="card-header">AUDIT REGISTRY</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>LOADING AUDITS...</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
              // No audits found.
            </div>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                    {["ID", "TITLE", "TYPE", "DEPT", "AUDITOR", "DATES", "ISSUES", "STATUS", "ACTION"].map((h) => (
                      <th key={h} style={{ textAlign: h === "ACTION" ? "center" : "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(a.id).padStart(3, "0")}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)", fontWeight: 500 }}>{a.title}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{a.audit_type || "—"}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{a.department_name || "—"}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                        {a.auditor_name || a.external_auditor || "—"}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)", whiteSpace: "nowrap" }}>
                        {a.start_date ? String(a.start_date).slice(0, 10) : "—"}
                        {" → "}
                        {a.end_date ? String(a.end_date).slice(0, 10) : "—"}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: a.open_issues > 0 ? "var(--color-error)" : "var(--color-primary)" }}>
                        {a.open_issues}/{a.num_issues}
                      </td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <span className={`chip ${statusChip(a.status)}`}>{a.status}</span>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", textAlign: "center" }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>$ edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="card-elevated" style={{ height: "fit-content" }}>
            <div className="card-header">{editingId ? `EDIT AUDIT #${editingId}` : "NEW AUDIT"}</div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="au-title">TITLE</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="au-title" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="au-type">TYPE</label>
                  <select id="au-type" value={form.audit_type} onChange={(e) => setForm({ ...form, audit_type: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="internal">internal</option>
                    <option value="external">external</option>
                    <option value="supplier">supplier</option>
                    <option value="compliance">compliance</option>
                    <option value="other">other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="au-dept">DEPARTMENT</label>
                  <select id="au-dept" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="">// none</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="au-auditor">INTERNAL AUDITOR</label>
                  <select id="au-auditor" value={form.auditor_user_id} onChange={(e) => setForm({ ...form, auditor_user_id: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="">// none</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="au-ext">EXTERNAL AUDITOR</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="au-ext" className="form-input" value={form.external_auditor} onChange={(e) => setForm({ ...form, external_auditor: e.target.value })} disabled={submitting} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="au-start">START</label>
                    <input id="au-start" type="date" className="form-input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} disabled={submitting} style={{ paddingLeft: "12px" }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="au-end">END</label>
                    <input id="au-end" type="date" className="form-input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} disabled={submitting} style={{ paddingLeft: "12px" }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="au-find">FINDINGS</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="au-find" className="form-input" value={form.findings_summary} onChange={(e) => setForm({ ...form, findings_summary: e.target.value })} disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="au-status">STATUS</label>
                  <select id="au-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={selectStyle} disabled={submitting}>
                    {["planned", "in_progress", "under_review", "completed"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
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
