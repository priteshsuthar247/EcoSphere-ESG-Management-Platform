"use client";
// src/app/dashboard/environmental/carbon/page.tsx
// Carbon Transactions log — TerminalUI

import { useCallback, useEffect, useState } from "react";

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
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/environmental/carbon-transactions?meta=1");
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
  }, []);

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
          # ENVIRONMENTAL / CARBON-TRANSACTIONS
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          CARBON TRANSACTIONS
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Log operational activity and calculate emissions via emission factors.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>{"// TOTAL EMISSIONS"}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 700, color: "var(--color-primary)" }}>
            {summary ? Number(summary.total_emissions).toFixed(2) : "–"}
            <span style={{ fontSize: "12px", color: "var(--color-text-dim)", marginLeft: "6px" }}>kgCO₂e</span>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>{"// TRANSACTIONS"}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--color-tertiary)" }}>
            {summary?.transaction_count ?? "–"}
          </div>
        </div>
        {(["1", "2", "3"] as const).map((s) => {
          const row = summary?.by_scope.find((x) => x.scope === s);
          return (
            <div key={s} className="stat-card">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>{"// SCOPE "}{s}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 700, color: "var(--color-secondary)" }}>
                {row ? Number(row.emissions).toFixed(1) : "0.0"}
              </div>
            </div>
          );
        })}
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
        <button type="button" className="btn btn-primary btn-md btn-cli" onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}>
          LOG TRANSACTION
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showForm ? "1fr minmax(300px, 400px)" : "1fr", gap: "var(--space-6)" }}>
        <div>
          <div className="card-header">TRANSACTION LEDGER</div>
          {loading ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <span className="spinner" />
              <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>LOADING LEDGER...</span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "var(--space-8)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
              {"// No carbon transactions logged yet."}
            </div>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                    {["ID", "DATE", "SOURCE", "FACTOR", "QTY", "EMISSIONS", "SCOPE", "DEPT", "PRODUCT", "BY"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{String(tx.id).padStart(3, "0")}</td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {String(tx.transaction_date).slice(0, 10)}
                      </td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        <span className="chip chip-cyan">{tx.source_type}</span>
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                        {tx.emission_factor_name || "—"}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)" }}>
                        {Number(tx.quantity).toFixed(2)}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-primary)", fontWeight: 500 }}>
                        {Number(tx.calculated_emissions_kgco2e).toFixed(2)}
                      </td>
                      <td style={{ padding: "10px var(--space-3)" }}>
                        {tx.scope ? (
                          <span className={`chip ${tx.scope === "1" ? "chip-red" : tx.scope === "2" ? "chip-amber" : "chip-cyan"}`}>
                            S{tx.scope}
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                        {tx.department_name || "—"}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-muted)" }}>
                        {tx.product_name || "—"}
                      </td>
                      <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>
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

        {showForm && (
          <div className="card-elevated" style={{ height: "fit-content" }}>
            <div className="card-header">LOG CARBON DATA</div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-date">DATE</label>
                  <input id="ct-date" type="date" className="form-input" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} required disabled={submitting} style={{ paddingLeft: "12px" }} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-source">SOURCE TYPE</label>
                  <select id="ct-source" value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} style={selectStyle} disabled={submitting}>
                    {SOURCE_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-factor">EMISSION FACTOR</label>
                  <select id="ct-factor" value={form.emission_factor_id} onChange={(e) => setForm({ ...form, emission_factor_id: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="">{"// manual emissions (no factor)"}</option>
                    {(meta?.emission_factors ?? []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} · S{f.scope ?? "?"} · {Number(f.value_kgco2e_per_unit).toFixed(4)}/{f.unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-qty">QUANTITY</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="ct-qty" className="form-input" type="number" step="any" min="0.0001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required disabled={submitting} />
                  </div>
                  {previewEmissions !== null && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-tertiary)", marginTop: "4px" }}>
                      {"// calc: "}{previewEmissions.toFixed(4)}{" kgCO₂e"}
                    </div>
                  )}
                </div>
                {!form.emission_factor_id && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="ct-em">MANUAL EMISSIONS (kgCO₂e)</label>
                    <div className="input-wrapper">
                      <span className="input-prompt">&gt;</span>
                      <input id="ct-em" className="form-input" type="number" step="any" min="0" value={form.calculated_emissions_kgco2e} onChange={(e) => setForm({ ...form, calculated_emissions_kgco2e: e.target.value })} required disabled={submitting} />
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-scope">SCOPE OVERRIDE</label>
                  <select id="ct-scope" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="">{"// inherit from factor"}</option>
                    <option value="1">Scope 1</option>
                    <option value="2">Scope 2</option>
                    <option value="3">Scope 3</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-dept">DEPARTMENT</label>
                  <select id="ct-dept" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="">{"// none"}</option>
                    {(meta?.departments ?? []).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-prod">PRODUCT (optional)</label>
                  <select id="ct-prod" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} style={selectStyle} disabled={submitting}>
                    <option value="">{"// none"}</option>
                    {(meta?.products ?? []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</option>
                    ))}
                  </select>
                </div>
                {form.product_id && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="ct-lc">LIFECYCLE STAGE</label>
                    <select id="ct-lc" value={form.lifecycle_stage} onChange={(e) => setForm({ ...form, lifecycle_stage: e.target.value })} style={selectStyle} disabled={submitting}>
                      {LIFECYCLE_STAGES.map((s) => (
                        <option key={s.value || "none"} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-ref">REFERENCE</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="ct-ref" className="form-input" value={form.source_reference} onChange={(e) => setForm({ ...form, source_reference: e.target.value })} disabled={submitting} placeholder="PO / invoice / trip id" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-desc">DESCRIPTION</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="ct-desc" className="form-input" value={form.source_description} onChange={(e) => setForm({ ...form, source_description: e.target.value })} disabled={submitting} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ct-notes">NOTES</label>
                  <div className="input-wrapper">
                    <span className="input-prompt">&gt;</span>
                    <input id="ct-notes" className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={submitting} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button type="submit" className={`btn btn-primary btn-md btn-cli btn-full${submitting ? " btn-loading" : ""}`} disabled={submitting}>
                    {submitting ? "LOGGING" : "COMMIT"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-md btn-full" onClick={() => setShowForm(false)} disabled={submitting}>
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
