"use client";
// ESG Policies — TerminalUI

import { useCallback, useEffect, useState, useMemo } from "react";
import Modal from "@/components/Modal";
import TableFilters, { matchesSearch, matchesStatus } from "@/components/TableFilters";

interface Policy {
  id: number;
  title: string;
  category: string | null;
  version: string;
  content: string | null;
  effective_date: string;
  expiry_date: string | null;
  requires_acknowledgement: number;
  status: string;
  created_by_name: string | null;
  acknowledgement_count: number;
  pending_user_count: number;
  user_has_acknowledged: number;
}

interface Stats {
  total: number;
  active: number;
  requiring_ack: number;
  total_acknowledgements: number;
}

const emptyForm = {
  title: "",
  category: "",
  version: "1.0",
  content: "",
  effective_date: new Date().toISOString().slice(0, 10),
  expiry_date: "",
  requires_acknowledgement: true,
  status: "active",
};

export default function PoliciesPage() {
  const [items, setItems] = useState<Policy[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ackingId, setAckingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/governance/policies?status=${statusFilter}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load policies");
      setItems(json.data.items);
      setStats(json.data.stats);
      setCanManage(Boolean(json.data.viewer?.canManage));
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

  function openEdit(p: Policy) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      category: p.category ?? "",
      version: p.version,
      content: p.content ?? "",
      effective_date: String(p.effective_date).slice(0, 10),
      expiry_date: p.expiry_date ? String(p.expiry_date).slice(0, 10) : "",
      requires_acknowledgement: Boolean(p.requires_acknowledgement),
      status: p.status,
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
      category: form.category || null,
      version: form.version,
      content: form.content || null,
      effective_date: form.effective_date,
      expiry_date: form.expiry_date || null,
      requires_acknowledgement: form.requires_acknowledgement,
      status: form.status,
    };
    try {
      const res = await fetch("/api/governance/policies", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      setSuccess(editingId ? "Policy updated." : "Policy created.");
      setShowForm(false);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcknowledge(policyId: number) {
    setAckingId(policyId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/governance/acknowledgements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_id: policyId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Acknowledge failed");
      setSuccess("Policy acknowledged.");
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAckingId(null);
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

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          ESG POLICIES
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Publish governance policies and collect employee acknowledgements.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "TOTAL", value: stats?.total, color: "var(--color-primary)" },
          { label: "ACTIVE", value: stats?.active, color: "var(--color-tertiary)" },
          { label: "REQ. ACK", value: stats?.requiring_ack, color: "var(--color-secondary)" },
          { label: "ACKS", value: stats?.total_acknowledgements, color: "var(--color-primary)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value ?? "–"}</div>
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
        searchPlaceholder="Search title, category, version…"
        status={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "draft", label: "Draft" },
          { value: "inactive", label: "Inactive" },
          { value: "archived", label: "Archived" },
        ]}
        extra={
          canManage ? (
            <button type="button" className="btn btn-primary btn-md" onClick={openCreate}>
              New policy
            </button>
          ) : null
        }
      />

      <div>
        <div>
          <div className="card-header">Policy registry</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)" }}>Loading policies…</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", textAlign: "center" }}>No policies found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {items.filter((p) => matchesSearch(search, [p.id, p.title, p.category, p.version, p.content])).map((p) => (
                <div key={p.id} style={{ border: "1px solid var(--color-border-subtle)", padding: "var(--space-4)", background: "var(--color-surface)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-2)" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)" }}>
                        ID {String(p.id).padStart(3, "0")} · v{p.version}
                        {p.category ? ` · ${p.category}` : ""}
                        {" · "}
                        {String(p.effective_date).slice(0, 10)}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "16px", fontWeight: 700, color: "var(--color-primary)" }}>{p.title}</div>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                      <span className={`chip ${p.status === "active" ? "chip-green" : "chip-muted"}`}>{p.status}</span>
                      {p.requires_acknowledgement ? (
                        p.user_has_acknowledged ? (
                          <span className="chip chip-cyan">acked</span>
                        ) : (
                          <span className="chip chip-amber">pending you</span>
                        )
                      ) : null}
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                        {expandedId === p.id ? "hide" : "view"}
                      </button>
                      {canManage && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      )}
                      {p.status === "active" && p.requires_acknowledgement && !p.user_has_acknowledged && (
                        <button type="button" className="btn btn-primary btn-sm" disabled={ackingId === p.id} onClick={() => handleAcknowledge(p.id)}>
                          {ackingId === p.id ? "ACKING" : "ACKNOWLEDGE"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "var(--space-2)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                    <div><span style={{ color: "var(--color-text-dim)" }}>ACKS </span><span style={{ color: "var(--color-tertiary)" }}>{p.acknowledgement_count}</span></div>
                    <div><span style={{ color: "var(--color-text-dim)" }}>Pending </span><span style={{ color: "var(--color-secondary)" }}>{p.pending_user_count}</span></div>
                    {p.created_by_name && (
                      <div><span style={{ color: "var(--color-text-dim)" }}>BY </span><span style={{ color: "var(--color-text-muted)" }}>{p.created_by_name}</span></div>
                    )}
                  </div>
                  {expandedId === p.id && (
                    <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", border: "1px dashed var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)", whiteSpace: "pre-wrap" }}>
                      {p.content || "No content provided."}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal
          open={showForm && canManage}
          title={editingId ? `Edit policy ${editingId}` : "New policy"}
          onClose={() => { if (!submitting) { setShowForm(false); setEditingId(null); } }}
          width={640}
        >
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label required" htmlFor="pol-title">Title</label>
                  <input id="pol-title" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required disabled={submitting} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pol-cat">Category</label>
                    <input id="pol-cat" className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={submitting} placeholder="ethics, environment..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label required" htmlFor="pol-ver">Version</label>
                    <input id="pol-ver" className="form-input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} required disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pol-content">Content</label>
                  <textarea
                    id="pol-content"
                    className="form-input"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    disabled={submitting}
                    rows={6}
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label required" htmlFor="pol-eff">Effective</label>
                    <input id="pol-eff" type="date" className="form-input" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} required disabled={submitting} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pol-exp">Expiry</label>
                    <input id="pol-exp" type="date" className="form-input" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required" htmlFor="pol-status">Status</label>
                  <select id="pol-status" className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={submitting}>
                    {["active", "draft", "inactive", "archived"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <label className="form-check">
                  <input type="checkbox" checked={form.requires_acknowledgement} onChange={(e) => setForm({ ...form, requires_acknowledgement: e.target.checked })} disabled={submitting} />
                  Requires employee acknowledgement
                </label>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button type="submit" className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                    {submitting ? "Saving…" : editingId ? "Save changes" : "Create policy"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-md btn-full" onClick={() => { setShowForm(false); setEditingId(null); }} disabled={submitting}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
        </Modal>
      </div>
    </div>
  );
}
