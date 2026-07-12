"use client";
// src/app/dashboard/reports/page.tsx
// ESG Summary page - TerminalUI design system

import { useState, useEffect } from "react";

interface ESGSummaryData {
  emissions: {
    scope1: number;
    scope2: number;
    scope3: number;
    total: number;
  };
  social: {
    active_volunteers: number;
    csr_points_allocated: number;
    csr_activities_completed: number;
  };
  governance: {
    open_issues: number;
    critical_issues: number;
    resolved_issues: number;
  };
}

export default function ESGSummaryPage() {
  const [data, setData] = useState<ESGSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports/summary");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load summary dataset");
      }

      setData(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          ESG OVERALL SUMMARY
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Real-time organizational Environmental, Social, and Governance aggregated metrics.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {error && (
        <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>
            RETRIEVING ESG AUDIT METRICS...
          </span>
        </div>
      ) : (
        data && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            
            {/* ── SECTION 1: ENVIRONMENTAL (EMISSIONS) ── */}
            <div className="card-elevated">
              <div className="card-header">ENVIRONMENTAL METRICS: CARBON ACCOUNTING</div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "var(--space-6)" }}>
                <div>
                  <p style={{ color: "var(--color-text-muted)", fontSize: "13px", marginBottom: "var(--space-4)" }}>
                    Carbon footprint summary divided by Scope classifications (Scope 1 = Direct, Scope 2 = Purchased Energy, Scope 3 = Indirect supply chain).
                  </p>
                  
                  {/* Scope lists */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    {[
                      { label: "SCOPE 1 (Direct Emissions)", value: data.emissions.scope1, color: "var(--color-primary)" },
                      { label: "SCOPE 2 (Indirect Emissions)", value: data.emissions.scope2, color: "var(--color-tertiary)" },
                      { label: "SCOPE 3 (Value Chain Emissions)", value: data.emissions.scope3, color: "var(--color-secondary)" }
                    ].map((s) => (
                      <div key={s.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "2px" }}>
                          <span style={{ color: "var(--color-text-primary)" }}>{s.label}</span>
                          <span style={{ color: s.color, fontWeight: "bold" }}>{s.value.toLocaleString()} kgCO2e</span>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "var(--color-border-subtle)" }}>
                          <div 
                            style={{ 
                              height: "100%", 
                              background: s.color, 
                              width: data.emissions.total > 0 ? `${(s.value / data.emissions.total) * 100}%` : "0%" 
                            }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total display box */}
                <div style={{ borderLeft: "1px dashed var(--color-border-medium)", paddingLeft: "var(--space-6)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.08em" }}>
                    TOTAL EMISSIONS LOG
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "32px", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1.2 }}>
                    {data.emissions.total.toLocaleString()}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    kgCO2e
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 2: SOCIAL & GOVERNANCE SPLIT ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
              
              {/* Social Summary Card */}
              <div className="card">
                <div className="card-header">SOCIAL METRICS: CSR & ENGAGEMENT</div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "13px", marginBottom: "var(--space-4)" }}>
                  Aggregated CSR volunteer participation records and point allocations.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {[
                    { label: "Active CSR Volunteers", value: `${data.social.active_volunteers} employees`, color: "var(--color-tertiary)" },
                    { label: "Incentive Points Awarded", value: `${data.social.csr_points_allocated.toLocaleString()} pts`, color: "var(--color-primary)" },
                    { label: "Completed CSR Activities", value: `${data.social.csr_activities_completed} logs`, color: "var(--color-secondary)" }
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>{">"} {item.label}</span>
                      <span style={{ color: item.color, fontWeight: "bold" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Governance Summary Card */}
              <div className="card">
                <div className="card-header">GOVERNANCE METRICS: COMPLIANCE STATUS</div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "13px", marginBottom: "var(--space-4)" }}>
                  Audit violations tracking and open compliance task queues.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {[
                    { label: "Open Compliance Issues", value: data.governance.open_issues, color: data.governance.open_issues > 0 ? "var(--color-error)" : "var(--color-text-muted)" },
                    { label: "Critical Severity Issues", value: data.governance.critical_issues, color: data.governance.critical_issues > 0 ? "var(--color-error)" : "var(--color-text-muted)" },
                    { label: "Resolved Audit Violations", value: data.governance.resolved_issues, color: "var(--color-primary)" }
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>{">"} {item.label}</span>
                      <span style={{ color: item.color, fontWeight: "bold" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )
      )}
    </div>
  );
}
