"use client";
// src/app/dashboard/environmental/emissions/page.tsx
// Emission Factors master data

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
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";

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
  const { draft, setSearch, setStatus, setExtra, apply, queryString } = useListQuery({
    extras: { scope: "all" },
  });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/environmental/emission-factors${queryString ? `?${queryString}` : ""}`,
      );
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

  const getSortValue = useCallback((row: EmissionFactor, key: string) => {
    switch (key) {
      case "id": return row.id;
      case "name": return row.name;
      case "scope": return row.scope ?? "";
      case "category": return row.category ?? "";
      case "value": return Number(row.value_kgco2e_per_unit);
      case "unit": return row.unit;
      case "source": return row.source ?? "";
      case "status": return row.status;
      default: return "";
    }
  }, []);

  const { sorted, sortKey, sortDir, toggle } = useTableSort(items, getSortValue, "id");

  return (
    <div>
      <PageHeader
        title="Emission factors"
        description="Maintain GHG conversion factors (kgCO₂e per unit) used for carbon accounting."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div className="stat-label">TOTAL</div>
          <div className="stat-value">{stats?.total ?? "–"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ACTIVE</div>
          <div className="stat-value" style={{ color: "var(--color-tertiary)" }}>{stats?.active ?? "–"}</div>
        </div>
        {(["1", "2", "3"] as const).map((s) => (
          <div key={s} className="stat-card">
            <div className="stat-label">Scope {s}</div>
            <div className="stat-value" style={{ color: "var(--color-secondary)" }}>
              {stats?.by_scope.find((x) => x.scope === s)?.count ?? 0}
            </div>
          </div>
        ))}
      </div>

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {success && <AlertBanner type="success">{success}</AlertBanner>}

      <TableFilters
        search={draft.search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, category, unit, source…"
        status={draft.status}
        onStatusChange={setStatus}
        statusOptions={[
          { value: "all", label: "All statuses" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "draft", label: "Draft" },
          { value: "archived", label: "Archived" },
        ]}
        extraFields={
          <div className="table-filter-field">
            <label className="form-label">Scope</label>
            <select
              className="form-input"
              value={draft.extras?.scope ?? "all"}
              onChange={(e) => setExtra("scope", e.target.value)}
            >
              <option value="all">All scopes</option>
              <option value="1">Scope 1</option>
              <option value="2">Scope 2</option>
              <option value="3">Scope 3</option>
            </select>
          </div>
        }
        onApply={apply}
        applying={loading}
      />
      <ToolbarActions>
        <button type="button" className="btn btn-primary btn-md" onClick={openCreate}>
          New factor
        </button>
      </ToolbarActions>

      <div>
        <SectionTitle>Factor registry</SectionTitle>
        {loading ? (
          <LoadingState label="Loading factors…" />
        ) : items.length === 0 ? (
          <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", textAlign: "center" }}>
            No emission factors found. Create one to begin carbon accounting.
          </div>
        ) : (
          <DataTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <SortableTh label="ID" columnKey="id" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Name" columnKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Scope" columnKey="scope" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Category" columnKey="category" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Value" columnKey="value" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Unit" columnKey="unit" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Source" columnKey="source" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <SortableTh label="Status" columnKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  <ActionTh />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <tr key={item.id}>
                    <td className="col-id">{String(item.id).padStart(3, "0")}</td>
                    <td style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{item.name}</td>
                    <td>
                      <span className={`chip ${item.scope === "1" ? "chip-red" : item.scope === "2" ? "chip-amber" : "chip-cyan"}`}>
                        {item.scope ? `S${item.scope}` : "—"}
                      </span>
                    </td>
                    <td style={{ color: "var(--color-text-muted)" }}>{item.category || "—"}</td>
                    <td style={{ color: "var(--color-primary)" }}>{Number(item.value_kgco2e_per_unit).toFixed(4)}</td>
                    <td style={{ color: "var(--color-text-muted)" }}>{item.unit}</td>
                    <td style={{ color: "var(--color-text-dim)" }}>{item.source || "—"}</td>
                    <td>
                      <StatusChip status={item.status} />
                    </td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(item)} style={{ marginRight: "6px" }}>Edit</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleStatus(item)}>
                        {item.status === "active" ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </DataTableWrap>
        )}
      </div>

      <Modal
        open={showForm}
        title={editingId ? `Edit factor #${editingId}` : "New emission factor"}
        onClose={() => { if (!submitting) { setShowForm(false); setEditingId(null); } }}
        width={640}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-group">
              <label className="form-label required" htmlFor="ef-name">Name</label>
              <input id="ef-name" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={submitting} />
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="ef-scope">Scope</label>
              <select id="ef-scope" className="form-input" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} disabled={submitting}>
                <option value="1">Scope 1 — Direct</option>
                <option value="2">Scope 2 — Energy</option>
                <option value="3">Scope 3 — Value chain</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ef-category">Category</label>
              <input id="ef-category" className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. electricity, fleet, waste" disabled={submitting} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="form-group">
                <label className="form-label required" htmlFor="ef-value">Value (kgCO₂e)</label>
                <input id="ef-value" className="form-input" type="number" step="any" min="0" value={form.value_kgco2e_per_unit} onChange={(e) => setForm({ ...form, value_kgco2e_per_unit: e.target.value })} required disabled={submitting} />
              </div>
              <div className="form-group">
                <label className="form-label required" htmlFor="ef-unit">Unit</label>
                <input id="ef-unit" className="form-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required disabled={submitting} placeholder="kWh, litre, km" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ef-source">Source</label>
              <input id="ef-source" className="form-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="DEFRA, EPA, custom" disabled={submitting} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="ef-from">Valid from</label>
                <input id="ef-from" type="date" className="form-input" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} disabled={submitting} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ef-to">Valid to</label>
                <input id="ef-to" type="date" className="form-input" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} disabled={submitting} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label required" htmlFor="ef-status">Status</label>
              <select id="ef-status" className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={submitting}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
              <button type="submit" className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Save changes" : "Create factor"}
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
