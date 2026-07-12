"use client";
// src/app/dashboard/environmental/products/page.tsx
// Product ESG Profiles — TerminalUI

import { useCallback, useEffect, useState } from "react";

interface Product {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  carbon_footprint_kgco2e_per_unit: number | null;
  status: string;
  lifecycle_total_kgco2e: number | null;
  lifecycle_stage_count: number;
  created_at: string;
}

interface LifecycleRow {
  id: number;
  product_id: number;
  lifecycle_stage: string;
  emissions_kgco2e: number;
  calculation_method: string | null;
  notes: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  total_footprint: number;
}

const LIFECYCLE_STAGES = [
  { value: "raw_material_sourcing", label: "Raw material sourcing" },
  { value: "inbound_transport", label: "Inbound transport" },
  { value: "manufacturing_production", label: "Manufacturing / production" },
  { value: "outbound_transport_distribution", label: "Outbound transport" },
  { value: "packaging", label: "Packaging" },
  { value: "use_phase", label: "Use phase" },
  { value: "end_of_life", label: "End of life" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  carbon_footprint_kgco2e_per_unit: "",
  status: "active",
};

const emptyLifecycle = {
  lifecycle_stage: "manufacturing_production",
  emissions_kgco2e: "",
  notes: "",
};

export default function ProductEsgProfilesPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleRow[]>([]);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleForm, setLifecycleForm] = useState(emptyLifecycle);
  const [lifecycleSubmitting, setLifecycleSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/environmental/products?status=all");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load products");
      setItems(json.data.items);
      setStats(json.data.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function loadLifecycle(productId: number) {
    setSelectedId(productId);
    setLifecycleLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/environmental/products?id=${productId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load lifecycle");
      setLifecycle(json.data.lifecycle);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLifecycleLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEdit(item: Product) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      sku: item.sku ?? "",
      category: item.category ?? "",
      carbon_footprint_kgco2e_per_unit:
        item.carbon_footprint_kgco2e_per_unit === null
          ? ""
          : String(item.carbon_footprint_kgco2e_per_unit),
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
      name: form.name,
      sku: form.sku || null,
      category: form.category || null,
      carbon_footprint_kgco2e_per_unit:
        form.carbon_footprint_kgco2e_per_unit === ""
          ? null
          : Number(form.carbon_footprint_kgco2e_per_unit),
      status: form.status,
    };
    try {
      const res = await fetch("/api/environmental/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Save failed");
      setSuccess(editingId ? "Product updated." : "Product created.");
      setShowForm(false);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLifecycleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setLifecycleSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/environmental/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lifecycle",
          product_id: selectedId,
          lifecycle_stage: lifecycleForm.lifecycle_stage,
          emissions_kgco2e: Number(lifecycleForm.emissions_kgco2e),
          notes: lifecycleForm.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Lifecycle save failed");
      setSuccess("Lifecycle emission recorded.");
      setLifecycleForm(emptyLifecycle);
      await loadLifecycle(selectedId);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLifecycleSubmitting(false);
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

  const stageLabel = (v: string) =>
    LIFECYCLE_STAGES.find((s) => s.value === v)?.label ?? v;

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # ENVIRONMENTAL / PRODUCT-ESG-PROFILES
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          PRODUCT ESG PROFILES
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Track product carbon footprints and lifecycle stage emissions.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>// PRODUCTS</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-primary)" }}>{stats?.total ?? "–"}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>// ACTIVE</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-tertiary)" }}>{stats?.active ?? "–"}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>// TOTAL FOOTPRINT</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 700, color: "var(--color-secondary)" }}>
            {stats ? `${Number(stats.total_footprint).toFixed(2)}` : "–"}
            <span style={{ fontSize: "12px", color: "var(--color-text-dim)", marginLeft: "6px" }}>kgCO₂e</span>
          </div>
        </div>
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

      <div style={{ marginBottom: "var(--space-4)" }}>
        <button type="button" className="btn btn-primary btn-md btn-cli" onClick={openCreate}>
          NEW PRODUCT
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showForm || selectedId ? "1fr minmax(300px, 380px)" : "1fr", gap: "var(--space-6)" }}>
        <div>
          <div className="card-header">PRODUCT CATALOGUE</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>LOADING PRODUCTS...</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
              // No products registered. Create a product ESG profile to continue.
            </div>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                    {["ID", "NAME", "SKU", "CATEGORY", "FOOTPRINT", "STAGES", "STATUS", "ACTION"].map((h) => (
                      <th key={h} style={{ textAlign: h === "ACTION" ? "center" : "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid var(--color-border-subtle)",
                        background: selectedId === item.id || editingId === item.id ? "rgba(0, 255, 65, 0.04)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(item.id).padStart(3, "0")}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)", fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{item.sku || "—"}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>{item.category || "—"}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-primary)" }}>
                        {item.carbon_footprint_kgco2e_per_unit === null
                          ? "—"
                          : `${Number(item.carbon_footprint_kgco2e_per_unit).toFixed(4)}`}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-tertiary)" }}>{item.lifecycle_stage_count}</td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <span className={`chip ${item.status === "active" ? "chip-green" : "chip-muted"}`}>{item.status}</span>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", textAlign: "center", whiteSpace: "nowrap" }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(item)} style={{ marginRight: "6px" }}>$ edit</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadLifecycle(item.id)}>lifecycle</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {showForm && (
            <div className="card-elevated">
              <div className="card-header">{editingId ? `EDIT PRODUCT #${editingId}` : "NEW PRODUCT PROFILE"}</div>
              <form onSubmit={handleSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-name">NAME</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input id="p-name" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={submitting} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-sku">SKU</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input id="p-sku" className="form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} disabled={submitting} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-cat">CATEGORY</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input id="p-cat" className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={submitting} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-fp">FOOTPRINT (kgCO₂e / unit)</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input id="p-fp" className="form-input" type="number" step="any" min="0" value={form.carbon_footprint_kgco2e_per_unit} onChange={(e) => setForm({ ...form, carbon_footprint_kgco2e_per_unit: e.target.value })} disabled={submitting} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-status">STATUS</label>
                    <select id="p-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={selectStyle} disabled={submitting}>
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

          {selectedId && (
            <div className="card-elevated">
              <div className="card-header">
                LIFECYCLE · PRODUCT #{selectedId}
                <button type="button" className="btn btn-ghost btn-sm" style={{ float: "right" }} onClick={() => setSelectedId(null)}>close</button>
              </div>

              {lifecycleLoading ? (
                <div style={{ padding: "var(--space-4)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>Loading stages...</div>
              ) : lifecycle.length === 0 ? (
                <div style={{ padding: "var(--space-4)", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
                  // No lifecycle stages recorded yet.
                </div>
              ) : (
                <div style={{ marginBottom: "var(--space-4)", maxHeight: "240px", overflowY: "auto" }}>
                  {lifecycle.map((row) => (
                    <div key={row.id} style={{ padding: "8px 0", borderBottom: "1px dashed var(--color-border-subtle)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                      <div style={{ color: "var(--color-primary)" }}>&gt; {stageLabel(row.lifecycle_stage)}</div>
                      <div style={{ color: "var(--color-text-muted)" }}>
                        {Number(row.emissions_kgco2e).toFixed(4)} kgCO₂e
                        {row.calculation_method ? ` · ${row.calculation_method}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleLifecycleSubmit}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="lc-stage">STAGE</label>
                    <select id="lc-stage" value={lifecycleForm.lifecycle_stage} onChange={(e) => setLifecycleForm({ ...lifecycleForm, lifecycle_stage: e.target.value })} style={selectStyle} disabled={lifecycleSubmitting}>
                      {LIFECYCLE_STAGES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="lc-em">EMISSIONS (kgCO₂e)</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input id="lc-em" className="form-input" type="number" step="any" min="0" value={lifecycleForm.emissions_kgco2e} onChange={(e) => setLifecycleForm({ ...lifecycleForm, emissions_kgco2e: e.target.value })} required disabled={lifecycleSubmitting} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="lc-notes">NOTES</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input id="lc-notes" className="form-input" value={lifecycleForm.notes} onChange={(e) => setLifecycleForm({ ...lifecycleForm, notes: e.target.value })} disabled={lifecycleSubmitting} />
                    </div>
                  </div>
                  <button type="submit" className={`btn btn-secondary btn-md btn-cli btn-full${lifecycleSubmitting ? " btn-loading" : ""}`} disabled={lifecycleSubmitting}>
                    {lifecycleSubmitting ? "SAVING" : "ADD STAGE EMISSION"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
