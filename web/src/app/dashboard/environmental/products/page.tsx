"use client";
// src/app/dashboard/environmental/products/page.tsx
// Product ESG Profiles — TerminalUI

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import TableFilters, { matchesSearch, matchesStatus } from "@/components/TableFilters";
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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


  const stageLabel = (v: string) =>
    LIFECYCLE_STAGES.find((s) => s.value === v)?.label ?? v;

  const filtered = items.filter(
    (item) =>
      matchesStatus(statusFilter, item.status) &&
      matchesSearch(search, [item.id, item.name, item.sku, item.category]),
  );

  const getSortValue = useCallback((row: Product, key: string): unknown => {
    switch (key) {
      case "id": return row.id;
      case "name": return row.name;
      case "sku": return row.sku ?? "";
      case "category": return row.category ?? "";
      case "footprint": return row.carbon_footprint_kgco2e_per_unit ?? null;
      case "stages": return row.lifecycle_stage_count;
      case "status": return row.status;
      default: return null;
    }
  }, []);

  const { sorted, sortKey, sortDir, toggle } = useTableSort(filtered, getSortValue, "id");

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
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
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>PRODUCTS</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-primary)" }}>{stats?.total ?? "–"}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>ACTIVE</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-tertiary)" }}>{stats?.active ?? "–"}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>TOTAL FOOTPRINT</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 700, color: "var(--color-secondary)" }}>
            {stats ? `${Number(stats.total_footprint).toFixed(2)}` : "–"}
            <span style={{ fontSize: "12px", color: "var(--color-text-dim)", marginLeft: "6px" }}>kgCO₂e</span>
          </div>
        </div>
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
        searchPlaceholder="Search products, SKU, category…"
        status={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "draft", label: "Draft" },
          { value: "archived", label: "Archived" },
        ]}
        extra={
          <button type="button" className="btn btn-primary btn-md" onClick={openCreate}>
            New product
          </button>
        }
      />

      <div>
        <div className="card-header">Product catalogue</div>
        {loading ? (
          <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
            <span className="spinner" />
            <span style={{ marginLeft: "var(--space-3)" }}>Loading products…</span>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", textAlign: "center" }}>
            No products registered. Create a product ESG profile to continue.
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh label="ID" columnKey="id" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Name" columnKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="SKU" columnKey="sku" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Category" columnKey="category" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Footprint" columnKey="footprint" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Stages" columnKey="stages" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Status" columnKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <th className="sortable-th" style={{ textAlign: "center", cursor: "default" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
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
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(item)} style={{ marginRight: "6px" }}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadLifecycle(item.id)}>Lifecycle</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        title={editingId ? `Edit product #${editingId}` : "New product profile"}
        onClose={() => { if (!submitting) { setShowForm(false); setEditingId(null); } }}
        width={560}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label required" htmlFor="p-name">Name</label>
              <input id="p-name" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="p-sku">SKU</label>
              <input id="p-sku" className="form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="p-cat">Category</label>
              <input id="p-cat" className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="p-fp">Footprint (kgCO₂e / unit)</label>
              <input id="p-fp" className="form-input" type="number" step="any" min="0" value={form.carbon_footprint_kgco2e_per_unit} onChange={(e) => setForm({ ...form, carbon_footprint_kgco2e_per_unit: e.target.value })} disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="p-status">Status</label>
              <select id="p-status" className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={submitting}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button type="submit" className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Save changes" : "Create product"}
              </button>
              <button type="button" className="btn btn-ghost btn-md btn-full" onClick={() => { setShowForm(false); setEditingId(null); }} disabled={submitting}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={selectedId !== null}
        title={`Lifecycle · product #${selectedId ?? ""}`}
        onClose={() => { if (!lifecycleSubmitting) setSelectedId(null); }}
        width={560}
      >
        {lifecycleLoading ? (
          <div style={{ padding: "var(--space-4)", color: "var(--color-text-muted)" }}>Loading stages…</div>
        ) : lifecycle.length === 0 ? (
          <div style={{ padding: "var(--space-2)", fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
            No lifecycle stages recorded yet.
          </div>
        ) : (
          <div style={{ marginBottom: "var(--space-4)", maxHeight: "240px", overflowY: "auto" }}>
            {lifecycle.map((row) => (
              <div key={row.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border-subtle)", fontSize: "12px" }}>
                <div style={{ color: "var(--color-primary)", fontWeight: 500 }}>{stageLabel(row.lifecycle_stage)}</div>
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
              <label className="form-label" htmlFor="lc-stage">Stage</label>
              <select id="lc-stage" className="form-input" value={lifecycleForm.lifecycle_stage} onChange={(e) => setLifecycleForm({ ...lifecycleForm, lifecycle_stage: e.target.value })} disabled={lifecycleSubmitting}>
                {LIFECYCLE_STAGES.map((st) => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="lc-em">Emissions (kgCO₂e)</label>
              <input id="lc-em" className="form-input" type="number" step="any" min="0" value={lifecycleForm.emissions_kgco2e} onChange={(e) => setLifecycleForm({ ...lifecycleForm, emissions_kgco2e: e.target.value })} required disabled={lifecycleSubmitting} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lc-notes">Notes</label>
              <input id="lc-notes" className="form-input" value={lifecycleForm.notes} onChange={(e) => setLifecycleForm({ ...lifecycleForm, notes: e.target.value })} disabled={lifecycleSubmitting} />
            </div>
            <button type="submit" className={`btn btn-secondary btn-md btn-full${lifecycleSubmitting ? " btn-loading" : ""}`} disabled={lifecycleSubmitting}>
              {lifecycleSubmitting ? "Saving…" : "Add stage emission"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
