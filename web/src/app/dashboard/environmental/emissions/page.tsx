"use client";
// src/app/dashboard/environmental/emissions/page.tsx
// Emission Factors master data — TerminalUI

import { useCallback, useEffect, useState } from "react";

interface EmissionFactor {
  id: number;
  name: string;
  scope: "1" | "2" | "3" | null;
  category: string | null;
  value_kgco2e_per_unit: number;
  unit: string;
  source: string | null;
  valid_from: string | null;
  valid_to: string | null;
  status: string;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  by_scope: { scope: string; count: number }[];
}

const emptyForm = {
  name: "",
  scope: "1",
  category: "",
  value_kgco2e_per_unit: "",
  unit: "kg",
  source: "",
  valid_from: "",
  valid_to: "",
  status: "active",
};

export default function EmissionFactorsPage() {
  const [items, setItems] = useState<EmissionFactor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status: "all" });
      if (scopeFilter !== "all") params.set("scope", scopeFilter);
      const res = await fetch(`/api/environmental/emission-factors?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load emission factors");
      }
      setItems(json.data.items);
      setStats(json.data.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [scopeFilter]);

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

  function openEdit(item: EmissionFactor) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      scope: item.scope ?? "1",
      category: item.category ?? "",
      value_kgco2e_per_unit: String(item.value_kgco2e_per_unit),
      unit: item.unit,
      source: item.source ?? "",
      valid_from: item.valid_from ? String(item.valid_from).slice(0, 10) : "",
      valid_to: item.valid_to ? String(item.valid_to).slice(0, 10) : "",
      status: item.status,
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
      scope: form.scope,
      category: form.category || null,
      value_kgco2e_per_unit: Number(form.value_kgco2e_per_unit),
      unit: form.unit,
      source: form.source || null,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      status: form.status,
    };

    try {
      const res = await fetch("/api/environmental/emission-factors", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Save failed");
      }
      setSuccess(editingId ? "Emission factor updated." : "Emission factor created.");
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(item: EmissionFactor) {
    const next = item.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/environmental/emission-factors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Status update failed");
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
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
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # ENVIRONMENTAL / EMISSION-FACTORS
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          EMISSION FACTORS
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Maintain GHG conversion factors (kgCO₂e per unit) used for carbon accounting.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>{"// TOTAL"}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-primary)" }}>{stats?.total ?? "–"}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>{"// ACTIVE"}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-tertiary)" }}>{stats?.active ?? "–"}</div>
        </div>
        {(["1", "2", "3"] as const).map((s) => (
          <div key={s} className="stat-card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>{"// SCOPE "}{s}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-secondary)" }}>
              {stats?.by_scope.find((x) => x.scope === s)?.count ?? 0}
            </div>
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

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-4)", alignItems: "center" }}>
        <button type="button" className="btn btn-primary btn-md btn-cli" onClick={openCreate}>
          NEW FACTOR
        </button>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-dim)" }}>{"// SCOPE"}</span>
          {["all", "1", "2", "3"].map((s) => (
            <button
              key={s}
              type="button"
              className={`chip ${scopeFilter === s ? "chip-green" : "chip-muted"}`}
              onClick={() => setScopeFilter(s)}
              style={{ cursor: "pointer" }}
            >
              {s === "all" ? "ALL" : `S${s}`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showForm ? "1fr 360px" : "1fr", gap: "var(--space-6)" }}>
        <div>
          <div className="card-header">FACTOR REGISTRY</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>LOADING FACTORS...</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
              {"// No emission factors found. Create one to begin carbon accounting."}
            </div>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                    {["ID", "NAME", "SCOPE", "CATEGORY", "VALUE", "UNIT", "SOURCE", "STATUS", "ACTION"].map((h) => (
                      <th key={h} style={{ textAlign: h === "ACTION" ? "center" : "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border-subtle)", background: editingId === item.id ? "rgba(0, 255, 65, 0.04)" : "transparent" }}>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(item.id).padStart(3, "0")}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)", fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <span className={`chip ${item.scope === "1" ? "chip-red" : item.scope === "2" ? "chip-amber" : "chip-cyan"}`}>
                          {item.scope ? `S${item.scope}` : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{item.category || "// —"}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-primary)" }}>{Number(item.value_kgco2e_per_unit).toFixed(4)}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{item.unit}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{item.source || "—"}</td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <span className={`chip ${item.status === "active" ? "chip-green" : "chip-muted"}`}>{item.status}</span>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", textAlign: "center", whiteSpace: "nowrap" }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(item)} style={{ marginRight: "6px" }}>$ edit</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleStatus(item)}>
                          {item.status === "active" ? "disable" : "enable"}
                        </button>
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
            <div className="card-header">{editingId ? `EDIT FACTOR #${editingId}` : "NEW EMISSION FACTOR"}</div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ef-name">NAME</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="ef-name" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ef-scope">SCOPE</label>
                  <select id="ef-scope" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="1">Scope 1 — Direct</option>
                    <option value="2">Scope 2 — Energy</option>
                    <option value="3">Scope 3 — Value chain</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ef-category">CATEGORY</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="ef-category" className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. electricity, fleet, waste" disabled={submitting} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ef-value">VALUE (kgCO₂e)</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input id="ef-value" className="form-input" type="number" step="any" min="0" value={form.value_kgco2e_per_unit} onChange={(e) => setForm({ ...form, value_kgco2e_per_unit: e.target.value })} required disabled={submitting} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ef-unit">UNIT</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input id="ef-unit" className="form-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required disabled={submitting} placeholder="kWh, litre, km" />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ef-source">SOURCE</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="ef-source" className="form-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="DEFRA, EPA, custom" disabled={submitting} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ef-from">VALID FROM</label>
                    <input id="ef-from" type="date" className="form-input" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} disabled={submitting} style={{ paddingLeft: "12px" }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ef-to">VALID TO</label>
                    <input id="ef-to" type="date" className="form-input" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} disabled={submitting} style={{ paddingLeft: "12px" }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ef-status">STATUS</label>
                  <select id="ef-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="draft">draft</option>
                    <option value="archived">archived</option>
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
