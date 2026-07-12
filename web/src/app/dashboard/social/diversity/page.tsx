"use client";
// src/app/dashboard/social/diversity/page.tsx
// Diversity Dashboard — TerminalUI (admin / ceo)

import { useCallback, useEffect, useState } from "react";
import TableFilters, { matchesSearch } from "@/components/TableFilters";
import { ChartCard, SimpleDonutChart } from "@/components/StatCharts";

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
  const [matrixSearch, setMatrixSearch] = useState("");

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
    rows: Array<Record<string, string | number | null | undefined>>;
    labelKey: string;
    valueKey?: string;
    percentKey?: string;
  }) {
    const max = Math.max(...rows.map((r) => Number(r[valueKey] ?? 0)), 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {rows.length === 0 ? (
          <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
            No data
          </div>
        ) : (
          rows.map((row, i) => {
            const label = String(row[labelKey] ?? "");
            const count = Number(row[valueKey] ?? 0);
            const percent = Number(row[percentKey] ?? 0);
            const width = Math.max(4, Math.round((count / max) * 100));
            return (
              <div key={`${label}-${i}`}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
                  <span style={{ color: "var(--color-primary)" }}>
                    {count} <span style={{ color: "var(--color-text-dim)" }}>({percent}%)</span>
                  </span>
                </div>
                <div style={{ height: "8px", border: "1px solid var(--color-border-medium)", background: "var(--color-bg)", borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${width}%`, background: "var(--color-primary)", borderRadius: 4 }} />
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
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span className="spinner" />
          <span style={{ marginLeft: "var(--space-3)", fontFamily: "var(--font-mono)" }}>COMPUTING DIVERSITY SNAPSHOT...</span>
        </div>
      ) : data ? (
        <>
          <div className="stats-grid" style={{ marginBottom: "var(--space-8)" }}>
            {[
              { label: "Active users", value: data.totals.active_employees, color: "var(--color-primary)" },
              { label: "With gender", value: data.totals.with_gender, color: "var(--color-tertiary)" },
              { label: "With department", value: data.totals.with_department, color: "var(--color-secondary)" },
              { label: "With DOB", value: data.totals.with_dob, color: "var(--color-primary)" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ fontSize: "12px", color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>{s.label}</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {data.by_gender.length > 0 && (
            <div className="charts-row" style={{ marginBottom: "var(--space-8)" }}>
              <ChartCard title="Workforce by gender" subtitle="Share of employees with gender set">
                <SimpleDonutChart
                  data={data.by_gender.map((g) => ({
                    label: g.gender,
                    value: g.count,
                  }))}
                />
              </ChartCard>
            </div>
          )}

          <div className="responsive-grid-2" style={{ marginBottom: "var(--space-8)" }}>
            <div>
              <div className="card-header">By gender</div>
              <div className="card-elevated">
                <BarList rows={data.by_gender} labelKey="gender" />
              </div>
            </div>
            <div>
              <div className="card-header">By role</div>
              <div className="card-elevated">
                <BarList rows={data.by_role} labelKey="role" />
              </div>
            </div>
            <div>
              <div className="card-header">By age band</div>
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
              <div className="card-header">By department</div>
              <div className="card-elevated">
                <BarList rows={data.by_department} labelKey="department_name" />
              </div>
            </div>
          </div>

          <div>
            <TableFilters
              search={matrixSearch}
              onSearchChange={setMatrixSearch}
              searchPlaceholder="Search department or gender…"
            />
            <div className="card-header">Gender × department matrix</div>
            {data.gender_by_department.filter((row) => matchesSearch(matrixSearch, [row.department_name, row.gender, row.count])).length === 0 ? (
              <div style={{ padding: "var(--space-6)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", textAlign: "center" }}>
                No matrix data available.
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-lg)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border-medium)", background: "var(--color-surface)" }}>
                      {["Department", "Gender", "Count"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "10px var(--space-3)", color: "var(--color-text-dim)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.gender_by_department.filter((row) => matchesSearch(matrixSearch, [row.department_name, row.gender, row.count])).map((row, i) => (
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
            Tip: complete gender / DOB / department on user profiles for richer metrics.
            {" "}
            <button type="button" className="btn btn-ghost btn-sm" onClick={fetchData}>Refresh</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
