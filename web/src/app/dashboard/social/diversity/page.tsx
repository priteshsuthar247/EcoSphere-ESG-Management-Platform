"use client";
// src/app/dashboard/social/diversity/page.tsx
// Diversity Dashboard — TerminalUI (admin / ceo)

import { useCallback, useEffect, useState } from "react";

interface DiversityData {
  totals: {
    active_employees: number;
    total_users: number;
    with_gender: number;
    with_department: number;
    with_dob: number;
  };
  by_gender: { gender: string; count: number; percent: number }[];
  by_role: { role: string; count: number; percent: number }[];
  by_department: {
    department_id: number | null;
    department_name: string;
    count: number;
    percent: number;
  }[];
  by_age_band: { band: string; count: number; percent: number }[];
  gender_by_department: {
    department_name: string;
    gender: string;
    count: number;
  }[];
}

const AGE_LABELS: Record<string, string> = {
  under_25: "Under 25",
  "25_34": "25–34",
  "35_44": "35–44",
  "45_54": "45–54",
  "55_plus": "55+",
  unknown: "Unknown",
};

export default function DiversityDashboardPage() {
  const [data, setData] = useState<DiversityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/social/diversity");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load diversity metrics");
      setData(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function BarList({
    rows,
    labelKey,
    valueKey = "count",
    percentKey = "percent",
  }: {
    rows: Record<string, string | number>[];
    labelKey: string;
    valueKey?: string;
    percentKey?: string;
  }) {
    const max = Math.max(...rows.map((r) => Number(r[valueKey] ?? 0)), 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {rows.length === 0 ? (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
            // No data
          </div>
        ) : (
          rows.map((row, i) => {
            const label = String(row[labelKey]);
            const count = Number(row[valueKey] ?? 0);
            const percent = Number(row[percentKey] ?? 0);
            const width = Math.max(4, Math.round((count / max) * 100));
            return (
              <div key={`${label}-${i}`}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>&gt; {label}</span>
                  <span style={{ color: "var(--color-primary)" }}>
                    {count} <span style={{ color: "var(--color-text-dim)" }}>({percent}%)</span>
                  </span>
                </div>
                <div style={{ height: "8px", border: "1px solid var(--color-border-medium)", background: "var(--color-bg)" }}>
                  <div style={{ height: "100%", width: `${width}%`, background: "var(--color-primary)" }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.10em", marginBottom: "4px" }}>
          # SOCIAL / DIVERSITY-DASHBOARD
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          DIVERSITY DASHBOARD
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Live workforce diversity metrics from the user directory (no static samples).
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {error && (
        <div className="msg msg-error" style={{ marginBottom: "var(--space-4)" }}>
          <span>[ERR]</span><span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>COMPUTING DIVERSITY SNAPSHOT...</span>
        </div>
      ) : data ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
            {[
              { label: "ACTIVE USERS", value: data.totals.active_employees, color: "var(--color-primary)" },
              { label: "WITH GENDER", value: data.totals.with_gender, color: "var(--color-tertiary)" },
              { label: "WITH DEPARTMENT", value: data.totals.with_department, color: "var(--color-secondary)" },
              { label: "WITH DOB", value: data.totals.with_dob, color: "var(--color-primary)" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>// {s.label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-6)", marginBottom: "var(--space-8)" }}>
            <div>
              <div className="card-header">BY GENDER</div>
              <div className="card-elevated">
                <BarList rows={data.by_gender} labelKey="gender" />
              </div>
            </div>
            <div>
              <div className="card-header">BY ROLE</div>
              <div className="card-elevated">
                <BarList rows={data.by_role} labelKey="role" />
              </div>
            </div>
            <div>
              <div className="card-header">BY AGE BAND</div>
              <div className="card-elevated">
                <BarList
                  rows={data.by_age_band.map((r) => ({
                    ...r,
                    band: AGE_LABELS[r.band] ?? r.band,
                  }))}
                  labelKey="band"
                />
              </div>
            </div>
            <div>
              <div className="card-header">BY DEPARTMENT</div>
              <div className="card-elevated">
                <BarList rows={data.by_department} labelKey="department_name" />
              </div>
            </div>
          </div>

          <div>
            <div className="card-header">GENDER × DEPARTMENT MATRIX</div>
            {data.gender_by_department.length === 0 ? (
              <div style={{ padding: "var(--space-6)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", textAlign: "center" }}>
                // No matrix data available.
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px dashed var(--color-border-medium)", background: "var(--color-surface)" }}>
                      {["DEPARTMENT", "GENDER", "COUNT"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.gender_by_department.map((row, i) => (
                      <tr key={`${row.department_name}-${row.gender}-${i}`} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-text-primary)" }}>{row.department_name}</td>
                        <td style={{ padding: "10px var(--space-3)" }}>
                          <span className="chip chip-cyan">{row.gender}</span>
                        </td>
                        <td style={{ padding: "10px var(--space-3)", color: "var(--color-primary)" }}>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ marginTop: "var(--space-6)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)" }}>
            // Tip: complete gender / DOB / department on user profiles for richer metrics.
            {" "}
            <button type="button" className="btn btn-ghost btn-sm" onClick={fetchData}>$ refresh</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
