"use client";
// src/app/dashboard/environmental/carbon/page.tsx
// Carbon Transactions log

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ChartCard, SimpleBarChart } from "@/components/StatCharts";
import { useTableSort } from "@/components/useTableSort";
import SortableTh from "@/components/SortableTh";

interface CarbonTx {
  id: number;
  transaction_date: string;
  source_type: string;
  source_reference: string | null;
  source_description: string | null;
  emission_factor_id: number | null;
  emission_factor_name: string | null;
  quantity: number;
  calculated_emissions_kgco2e: number;
  department_id: number | null;
  department_name: string | null;
  scope: string | null;
  product_id: number | null;
  product_name: string | null;
  lifecycle_stage: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface Summary {
  total_emissions: number;
  transaction_count: number;
  by_scope: { scope: string; emissions: number; count: number }[];
  by_source: { source_type: string; emissions: number; count: number }[];
}

interface Meta {
  emission_factors: { id: number; name: string; scope: string | null; value_kgco2e_per_unit: number; unit: string; status: string }[];
  products: { id: number; name: string; sku: string | null }[];
  departments: { id: number; name: string }[];
}

const SOURCE_TYPES = [
  "purchase",
  "manufacturing",
  "expense",
  "fleet",
  "manual_entry",
  "other",
] as const;

const LIFECYCLE_STAGES = [
  { value: "", label: "// none" },
  { value: "raw_material_sourcing", label: "Raw material sourcing" },
  { value: "inbound_transport", label: "Inbound transport" },
  { value: "manufacturing_production", label: "Manufacturing" },
  { value: "outbound_transport_distribution", label: "Outbound transport" },
  { value: "packaging", label: "Packaging" },
  { value: "use_phase", label: "Use phase" },
  { value: "end_of_life", label: "End of life" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  transaction_date: new Date().toISOString().slice(0, 10),
  source_type: "manual_entry",
  source_reference: "",
  source_description: "",
  emission_factor_id: "",
  quantity: "",
  calculated_emissions_kgco2e: "",
  department_id: "",
  scope: "",
  product_id: "",
  lifecycle_stage: "",
  notes: "",
};

export default function CarbonTransactionsPage() {
  const [items, setItems] = useState<CarbonTx[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { draft, setSearch, setStatus, apply, queryString } = useListQuery();
  const [sourceFilter, setSourceFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(queryString);
      params.set("meta", "1");
      const res = await fetch(`/api/environmental/carbon-transactions?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load carbon data");
      setItems(json.data.items);
      setSummary(json.data.summary);
      setMeta(json.data.meta);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Preview calculated emissions when factor + quantity change
  const selectedFactor = meta?.emission_factors.find(
    (f) => String(f.id) === form.emission_factor_id,
  );
  const previewEmissions =
    selectedFactor && form.quantity
      ? Number(form.quantity) * Number(selectedFactor.value_kgco2e_per_unit)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/environmental/carbon-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_date: form.transaction_date,
          source_type: form.source_type,
          source_reference: form.source_reference || null,
          source_description: form.source_description || null,
          emission_factor_id: form.emission_factor_id || null,
          quantity: Number(form.quantity),
          calculated_emissions_kgco2e: form.emission_factor_id
            ? null
            : form.calculated_emissions_kgco2e
              ? Number(form.calculated_emissions_kgco2e)
              : null,
          department_id: form.department_id || null,
          scope: form.scope || null,
          product_id: form.product_id || null,
          lifecycle_stage: form.lifecycle_stage || null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to log transaction");
      setSuccess("Carbon transaction logged.");
      setShowForm(false);
      setForm({ ...emptyForm, transaction_date: new Date().toISOString().slice(0, 10) });
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // Source type is a client convenience filter on the server-returned page slice
  const filteredTx = useMemo(
    () =>
      items.filter((tx) => sourceFilter === "all" || tx.source_type === sourceFilter),
    [items, sourceFilter],
  );

  const getTxSort = useCallback((tx: CarbonTx, key: string) => {
    switch (key) {
      case "id": return tx.id;
      case "date": return tx.transaction_date;
      case "source": return tx.source_type;
      case "factor": return tx.emission_factor_name ?? "";
      case "qty": return Number(tx.quantity);
      case "emissions": return Number(tx.calculated_emissions_kgco2e);
      case "scope": return tx.scope ?? "";
      case "dept": return tx.department_name ?? "";
      case "product": return tx.product_name ?? "";
      case "by": return tx.created_by_name ?? "";
      default: return "";
    }
  }, []);

  const { sorted: sortedTx, sortKey, sortDir, toggle } = useTableSort(
    filteredTx,
    getTxSort,
    "date",
    "desc",
  );

  return (
    <div>
      <div className="page-header">
        <h1>Carbon transactions</h1>
        <p>
          Log purchase, manufacturing, expense, or fleet activity. When auto emission calculation is enabled in ESG settings,
          emissions are computed from quantity × emission factor (no manual kgCO₂e required).
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div style={{ fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>Total emissions</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-primary)" }}>
            {summary ? Number(summary.total_emissions).toFixed(2) : "–"}
            <span style={{ fontSize: "12px", color: "var(--color-text-dim)", marginLeft: "6px" }}>kgCO₂e</span>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>Transactions</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--color-tertiary)" }}>
            {summary?.transaction_count ?? "–"}
          </div>
        </div>
        {(["1", "2", "3"] as const).map((s) => {
          const row = summary?.by_scope.find((x) => x.scope === s);
          return (
            <div key={s} className="stat-card">
              <div style={{ fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>Scope {s}</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-secondary)" }}>
                {row ? Number(row.emissions).toFixed(1) : "0.0"}
              </div>
            </div>
          );
        })}
      </div>

      {summary && (
        <div className="charts-row" style={{ marginBottom: "var(--space-6)" }}>
          <ChartCard title="Emissions by scope" subtitle="kgCO₂e breakdown">
            <SimpleBarChart
              data={(["1", "2", "3"] as const).map((s, i) => {
                const row = summary.by_scope.find((x) => String(x.scope) === s);
                return {
                  label: `Scope ${s}`,
                  value: row ? Number(row.emissions) : 0,
                  color: ["#0075DE", "#0D9488", "#F59E0B"][i],
                };
              })}
            />
          </ChartCard>
        </div>
      )}

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

      <TableFilters
        search={draft.search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference, factor, dept…"
        status={sourceFilter}
        onStatusChange={setSourceFilter}
        statusOptions={[
          { value: "all", label: "All sources" },
          ...SOURCE_TYPES.map((s) => ({ value: s, label: s })),
        ]}
            
      onApply={apply}

      applying={loading}

      />
          <ToolbarActions>
            <button type="button" className="btn btn-primary btn-md" onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}>
            Log transaction
          </button>
          </ToolbarActions>
      <div>
        <div>
          <div className="card-header">Transaction ledger</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)" }}>Loading ledger…</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", textAlign: "center" }}>
              No carbon transactions logged yet.
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableTh label="ID" columnKey="id" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Date" columnKey="date" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Source" columnKey="source" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Factor" columnKey="factor" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Qty" columnKey="qty" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Emissions" columnKey="emissions" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Scope" columnKey="scope" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Dept" columnKey="dept" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="Product" columnKey="product" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                    <SortableTh label="By" columnKey="by" sortKey={sortKey} sortDir={sortDir} onSort={toggle} />
                  </tr>
                </thead>
                <tbody>
                  {sortedTx.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ color: "var(--color-text-dim)" }}>{String(tx.id).padStart(3, "0")}</td>
                      <td style={{ color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {String(tx.transaction_date).slice(0, 10)}
                      </td>
                      <td>
                        <span className="chip chip-cyan">{tx.source_type}</span>
                      </td>
                      <td style={{ color: "var(--color-text-muted)" }}>
                        {tx.emission_factor_name || "—"}
                      </td>
                      <td style={{ color: "var(--color-text-primary)" }}>
                        {Number(tx.quantity).toFixed(2)}
                      </td>
                      <td style={{ color: "var(--color-primary)", fontWeight: 500 }}>
                        {Number(tx.calculated_emissions_kgco2e).toFixed(2)}
                      </td>
                      <td>
                        {tx.scope ? (
                          <span className={`chip ${tx.scope === "1" ? "chip-red" : tx.scope === "2" ? "chip-amber" : "chip-cyan"}`}>
                            S{tx.scope}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ color: "var(--color-text-muted)" }}>
                        {tx.department_name || "—"}
                      </td>
                      <td style={{ color: "var(--color-text-muted)" }}>
                        {tx.product_name || "—"}
                      </td>
                      <td style={{ color: "var(--color-text-dim)" }}>
                        {tx.created_by_name || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Source breakdown */}
          {summary && summary.by_source.length > 0 && (
            <div style={{ marginTop: "var(--space-6)" }}>
              <div className="card-header">BY SOURCE TYPE</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
                {summary.by_source.map((s) => (
                  <div key={s.source_type} style={{ padding: "12px var(--space-4)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                    <div style={{ color: "var(--color-text-dim)", fontSize: "11px", marginBottom: "4px" }}>&gt; {s.source_type}</div>
                    <div style={{ color: "var(--color-primary)", fontWeight: 700 }}>{Number(s.emissions).toFixed(2)} kgCO₂e</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>{s.count} tx</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Modal
          open={showForm}
          title="Log carbon data"
          onClose={() => { if (!submitting) setShowForm(false); }}
          width={640}
        >
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label required" htmlFor="ct-date">Date</label>
                  <input id="ct-date" type="date" className="form-input" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} required disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label required" htmlFor="ct-source">Source type</label>
                  <select id="ct-source" className="form-input" value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} disabled={submitting}>
                    {SOURCE_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-factor">Emission factor</label>
                  <select id="ct-factor" className="form-input" value={form.emission_factor_id} onChange={(e) => setForm({ ...form, emission_factor_id: e.target.value })} disabled={submitting}>
                    <option value="">Manual emissions (no factor)</option>
                    {(meta?.emission_factors ?? []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} · S{f.scope ?? "?"} · {Number(f.value_kgco2e_per_unit).toFixed(4)}/{f.unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required" htmlFor="ct-qty">Quantity</label>
                  <input id="ct-qty" className="form-input" type="number" step="any" min="0.0001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required disabled={submitting} />
                  {previewEmissions !== null && (
                    <div style={{ fontSize: "12px", color: "var(--color-primary)", marginTop: "4px" }}>
                      Calc: {previewEmissions.toFixed(4)} kgCO₂e
                    </div>
                  )}
                </div>
                {!form.emission_factor_id && (
                  <div className="form-group">
                    <label className="form-label required" htmlFor="ct-em">Manual emissions (kgCO₂e)</label>
                    <input id="ct-em" className="form-input" type="number" step="any" min="0" value={form.calculated_emissions_kgco2e} onChange={(e) => setForm({ ...form, calculated_emissions_kgco2e: e.target.value })} required disabled={submitting} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-scope">Scope override</label>
                  <select id="ct-scope" className="form-input" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} disabled={submitting}>
                    <option value="">Inherit from factor</option>
                    <option value="1">Scope 1</option>
                    <option value="2">Scope 2</option>
                    <option value="3">Scope 3</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-dept">Department</label>
                  <select id="ct-dept" className="form-input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} disabled={submitting}>
                    <option value="">None</option>
                    {(meta?.departments ?? []).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-prod">Product (optional)</label>
                  <select id="ct-prod" className="form-input" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} disabled={submitting}>
                    <option value="">None</option>
                    {(meta?.products ?? []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</option>
                    ))}
                  </select>
                </div>
                {form.product_id && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="ct-lc">Lifecycle stage</label>
                    <select id="ct-lc" className="form-input" value={form.lifecycle_stage} onChange={(e) => setForm({ ...form, lifecycle_stage: e.target.value })} disabled={submitting}>
                      {LIFECYCLE_STAGES.map((s) => (
                        <option key={s.value || "none"} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-ref">Reference</label>
                  <input id="ct-ref" className="form-input" value={form.source_reference} onChange={(e) => setForm({ ...form, source_reference: e.target.value })} disabled={submitting} placeholder="PO / invoice / trip id" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-desc">Description</label>
                  <input id="ct-desc" className="form-input" value={form.source_description} onChange={(e) => setForm({ ...form, source_description: e.target.value })} disabled={submitting} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-notes">Notes</label>
                  <input id="ct-notes" className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={submitting} />
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button type="submit" className={`btn btn-primary btn-md btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                    {submitting ? "Logging…" : "Save transaction"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-md btn-full" onClick={() => setShowForm(false)} disabled={submitting}>
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
