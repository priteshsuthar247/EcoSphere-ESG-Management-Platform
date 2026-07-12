"use client";
// Compliance Issues — TerminalUI

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import TableFilters, { matchesSearch, matchesStatus } from "@/components/TableFilters";

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
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/governance/compliance?meta=1&status=all`);
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
  }, []);

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
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: s.color }}>{s.value ?? "–"}</div>
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
        searchPlaceholder="Search issues, owner, department…"
        status={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[
          { value: "all", label: "All statuses" },
          { value: "open", label: "Open" },
          { value: "in_progress", label: "In progress" },
          { value: "overdue", label: "Overdue" },
          { value: "resolved", label: "Resolved" },
        ]}
        extra={
          <button type="button" className="btn btn-primary btn-md" onClick={openCreate}>
            New issue
          </button>
        }
      />

      <div>
        <div className="card-header">Issue registry</div>
        {loading ? (
          <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
            <span className="spinner" />
            <span style={{ marginLeft: "var(--space-3)" }}>Loading issues…</span>
          </div>
        ) : items.filter((issue) => matchesStatus(statusFilter, issue.status) && matchesSearch(search, [issue.id, issue.title, issue.description, issue.owner_name, issue.department_name, issue.audit_title, issue.severity])).length === 0 ? (
          <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", textAlign: "center" }}>
            No compliance issues found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {items.filter((issue) => matchesStatus(statusFilter, issue.status) && matchesSearch(search, [issue.id, issue.title, issue.description, issue.owner_name, issue.department_name, issue.audit_title, issue.severity])).map((issue) => (
              <div key={issue.id} style={{ border: "1px solid var(--color-border-subtle)", padding: "var(--space-4)", background: issue.flagged_overdue ? "rgba(255, 0, 64, 0.04)" : "var(--color-surface)", borderRadius: "var(--radius-lg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)" }}>
                      ID {String(issue.id).padStart(3, "0")}
                      {issue.audit_title ? ` · audit: ${issue.audit_title}` : ""}
                      {issue.department_name ? ` · ${issue.department_name}` : ""}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: 700, color: "var(--color-primary)" }}>{issue.title}</div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`chip ${severityChip(issue.severity)}`}>{issue.severity}</span>
                    <span className={`chip ${statusChip(issue.status)}`}>{issue.status}</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(issue)}>Edit</button>
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                  {issue.description}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-2)", fontSize: "12px" }}>
                  <div>
                    <span style={{ color: "var(--color-text-dim)" }}>Owner </span>
                    <span style={{ color: "var(--color-tertiary)" }}>{issue.owner_name}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--color-text-dim)" }}>Due </span>
                    <span style={{ color: issue.flagged_overdue ? "var(--color-error)" : "var(--color-secondary)" }}>
                      {String(issue.due_date).slice(0, 10)}
                      {issue.flagged_overdue ? " (overdue)" : ""}
                    </span>
                  </div>
                  {issue.resolution_notes && (
                    <div>
                      <span style={{ color: "var(--color-text-dim)" }}>Resolution </span>
                      <span style={{ color: "var(--color-text-muted)" }}>{issue.resolution_notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        title={editingId ? `Edit issue #${editingId}` : "New compliance issue"}
        onClose={() => { if (!submitting) { setShowForm(false); setEditingId(null); } }}
        width={640}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label required" htmlFor="ci-title">Title</label>
              <input id="ci-title" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="ci-desc">Description</label>
              <input id="ci-desc" className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required disabled={submitting} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="ci-sev">Severity</label>
                <select id="ci-sev" className="form-input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} disabled={submitting}>
                  {["low", "medium", "high", "critical"].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ci-status">Status</label>
                <select id="ci-status" className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={submitting}>
                  {["open", "in_progress", "overdue", "resolved"].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="ci-owner">Owner</label>
              <select id="ci-owner" className="form-input" value={form.owner_user_id} onChange={(e) => setForm({ ...form, owner_user_id: e.target.value })} required disabled={submitting}>
                <option value="">Select owner</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="ci-due">Due date</label>
              <input id="ci-due" type="date" className="form-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ci-dept">Department</label>
              <select id="ci-dept" className="form-input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} disabled={submitting}>
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ci-audit">Linked audit</label>
              <select id="ci-audit" className="form-input" value={form.audit_id} onChange={(e) => setForm({ ...form, audit_id: e.target.value })} disabled={submitting}>
                <option value="">None</option>
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>{a.title} ({a.status})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ci-res">Resolution notes</label>
              <input id="ci-res" className="form-input" value={form.resolution_notes} onChange={(e) => setForm({ ...form, resolution_notes: e.target.value })} disabled={submitting} />
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
              <button type="submit" className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Save changes" : "Create issue"}
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
