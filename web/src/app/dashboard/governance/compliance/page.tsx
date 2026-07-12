"use client";
// Compliance Issues — TerminalUI

import { useCallback, useEffect, useState } from "react";

interface Issue {
  id: number;
  audit_id: number | null;
  audit_title: string | null;
  title: string;
  description: string;
  severity: string;
  department_id: number | null;
  department_name: string | null;
  owner_user_id: number;
  owner_name: string;
  due_date: string;
  status: string;
  resolution_notes: string | null;
  flagged_overdue: number;
}

interface Stats {
  total: number;
  open: number;
  in_progress: number;
  overdue: number;
  resolved: number;
  critical: number;
}

const emptyForm = {
  title: "",
  description: "",
  severity: "medium",
  audit_id: "",
  department_id: "",
  owner_user_id: "",
  due_date: "",
  status: "open",
  resolution_notes: "",
};

export default function ComplianceIssuesPage() {
  const [items, setItems] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [audits, setAudits] = useState<{ id: number; title: string; status: string }[]>([]);
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
      const res = await fetch(`/api/governance/compliance?meta=1&status=${statusFilter}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load compliance issues");
      setItems(json.data.items);
      setStats(json.data.stats);
      setDepartments(json.data.departments ?? []);
      setUsers(json.data.users ?? []);
      setAudits(json.data.audits ?? []);
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

  function openEdit(issue: Issue) {
    setEditingId(issue.id);
    setForm({
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      audit_id: issue.audit_id === null ? "" : String(issue.audit_id),
      department_id: issue.department_id === null ? "" : String(issue.department_id),
      owner_user_id: String(issue.owner_user_id),
      due_date: String(issue.due_date).slice(0, 10),
      status: issue.status,
      resolution_notes: issue.resolution_notes ?? "",
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
      description: form.description,
      severity: form.severity,
      audit_id: form.audit_id || null,
      department_id: form.department_id || null,
      owner_user_id: Number(form.owner_user_id),
      due_date: form.due_date,
      status: form.status,
      resolution_notes: form.resolution_notes || null,
    };
    try {
      const res = await fetch("/api/governance/compliance", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      setSuccess(editingId ? "Issue updated." : "Issue created.");
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

  function severityChip(s: string) {
    if (s === "critical") return "chip-red";
    if (s === "high") return "chip-amber";
    if (s === "medium") return "chip-cyan";
    return "chip-muted";
  }

  function statusChip(s: string) {
    if (s === "resolved") return "chip-green";
    if (s === "overdue") return "chip-red";
    if (s === "in_progress") return "chip-cyan";
    return "chip-amber";
  }

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # GOVERNANCE / COMPLIANCE-ISSUES
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          COMPLIANCE ISSUES
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Track violations with owner, severity, due date, and overdue auto-flagging.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "TOTAL", value: stats?.total, color: "var(--color-primary)" },
          { label: "OPEN", value: stats?.open, color: "var(--color-secondary)" },
          { label: "IN PROGRESS", value: stats?.in_progress, color: "var(--color-tertiary)" },
          { label: "OVERDUE", value: stats?.overdue, color: "var(--color-error)" },
          { label: "RESOLVED", value: stats?.resolved, color: "var(--color-primary)" },
          { label: "CRITICAL", value: stats?.critical, color: "var(--color-error)" },
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
        <button type="button" className="btn btn-primary btn-md btn-cli" onClick={openCreate}>NEW ISSUE</button>
        {["all", "open", "in_progress", "overdue", "resolved"].map((s) => (
          <button key={s} type="button" className={`chip ${statusFilter === s ? "chip-green" : "chip-muted"}`} onClick={() => setStatusFilter(s)} style={{ cursor: "pointer" }}>{s}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showForm ? "1fr minmax(300px, 380px)" : "1fr", gap: "var(--space-6)" }}>
        <div>
          <div className="card-header">ISSUE REGISTRY</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>LOADING ISSUES...</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
              // No compliance issues found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {items.map((issue) => (
                <div key={issue.id} style={{ border: "1px solid var(--color-border-subtle)", padding: "var(--space-4)", background: issue.flagged_overdue ? "rgba(255, 0, 64, 0.04)" : "var(--color-surface)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)" }}>
                        #{String(issue.id).padStart(3, "0")}
                        {issue.audit_title ? ` · audit: ${issue.audit_title}` : ""}
                        {issue.department_name ? ` · ${issue.department_name}` : ""}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: 700, color: "var(--color-primary)" }}>{issue.title}</div>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                      <span className={`chip ${severityChip(issue.severity)}`}>{issue.severity}</span>
                      <span className={`chip ${statusChip(issue.status)}`}>{issue.status}</span>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(issue)}>$ edit</button>
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                    {issue.description}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-2)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "var(--color-text-dim)" }}>// OWNER </span>
                      <span style={{ color: "var(--color-tertiary)" }}>{issue.owner_name}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--color-text-dim)" }}>// DUE </span>
                      <span style={{ color: issue.flagged_overdue ? "var(--color-error)" : "var(--color-secondary)" }}>
                        {String(issue.due_date).slice(0, 10)}
                        {issue.flagged_overdue ? " [OVERDUE]" : ""}
                      </span>
                    </div>
                    {issue.resolution_notes && (
                      <div>
                        <span style={{ color: "var(--color-text-dim)" }}>// RESOLUTION </span>
                        <span style={{ color: "var(--color-text-muted)" }}>{issue.resolution_notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && (
          <div className="card-elevated" style={{ height: "fit-content" }}>
            <div className="card-header">{editingId ? `EDIT ISSUE #${editingId}` : "NEW COMPLIANCE ISSUE"}</div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ci-title">TITLE</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="ci-title" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ci-desc">DESCRIPTION</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="ci-desc" className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required disabled={submitting} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ci-sev">SEVERITY</label>
                    <select id="ci-sev" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={selectStyle} disabled={submitting}>
                      {["low", "medium", "high", "critical"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ci-status">STATUS</label>
                    <select id="ci-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={selectStyle} disabled={submitting}>
                      {["open", "in_progress", "overdue", "resolved"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ci-owner">OWNER *</label>
                  <select id="ci-owner" value={form.owner_user_id} onChange={(e) => setForm({ ...form, owner_user_id: e.target.value })} style={selectStyle} required disabled={submitting}>
                    <option value="">// select owner</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ci-due">DUE DATE *</label>
                  <input id="ci-due" type="date" className="form-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required disabled={submitting} style={{ paddingLeft: "12px" }} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ci-dept">DEPARTMENT</label>
                  <select id="ci-dept" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="">// none</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ci-audit">LINKED AUDIT</label>
                  <select id="ci-audit" value={form.audit_id} onChange={(e) => setForm({ ...form, audit_id: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="">// none</option>
                    {audits.map((a) => (
                      <option key={a.id} value={a.id}>{a.title} ({a.status})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ci-res">RESOLUTION NOTES</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="ci-res" className="form-input" value={form.resolution_notes} onChange={(e) => setForm({ ...form, resolution_notes: e.target.value })} disabled={submitting} />
                  </div>
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
