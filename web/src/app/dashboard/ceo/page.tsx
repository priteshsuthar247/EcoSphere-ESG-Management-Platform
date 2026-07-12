// src/app/dashboard/ceo/page.tsx
// CEO Dashboard — executive ESG overview

import { headers } from "next/headers";
import pool from "@/config/db";
import type { RowDataPacket } from "mysql2";
import { ChartCard, SimpleBarChart } from "@/components/StatCharts";
import {
  getOrgOverallEsgScore,
  getLatestDepartmentScores,
  recalculateDepartmentEsgScores,
} from "@/services/esgScoreService";

interface ESGStats extends RowDataPacket {
  avg_env: number | null;
  avg_social: number | null;
  avg_gov: number | null;
  avg_total: number | null;
  dept_count: number;
}

interface TopDept extends RowDataPacket {
  name: string;
  total_score: number | null;
}

async function getCEOStats() {
  try {
    const [scoreRows] = await pool.execute<ESGStats[]>(`
      SELECT
        ROUND(AVG(environmental_score), 1) AS avg_env,
        ROUND(AVG(social_score), 1)        AS avg_social,
        ROUND(AVG(governance_score), 1)    AS avg_gov,
        ROUND(AVG(total_score), 1)         AS avg_total,
        COUNT(DISTINCT department_id)      AS dept_count
      FROM department_esg_scores
      WHERE as_of_date = (SELECT MAX(as_of_date) FROM department_esg_scores)
    `);

    const [topDepts] = await pool.execute<TopDept[]>(`
      SELECT d.name, s.total_score
      FROM department_esg_scores s
      JOIN departments d ON d.id = s.department_id
      WHERE s.as_of_date = (SELECT MAX(as_of_date) FROM department_esg_scores)
      ORDER BY s.total_score DESC
      LIMIT 5
    `);

    return { scores: scoreRows[0] ?? null, topDepts };
  } catch {
    return { scores: null, topDepts: [] };
  }
}

export default async function CEODashboard() {
  const headersList = headers();
  const userName = headersList.get("x-user-name") ?? "CEO";
  let { scores, topDepts } = await getCEOStats();

  // Prefer live scoring engine; auto-run if no rows yet
  let overall = await getOrgOverallEsgScore();
  let liveDepts = await getLatestDepartmentScores();
  if (liveDepts.length === 0) {
    try {
      liveDepts = await recalculateDepartmentEsgScores();
      overall = await getOrgOverallEsgScore();
    } catch {
      // keep SQL fallbacks
    }
  }
  if (liveDepts.length > 0) {
    topDepts = liveDepts.slice(0, 5).map((d) => ({
      name: d.department_name,
      total_score: d.total_score,
    })) as typeof topDepts;
  }

  const useLive = liveDepts.length > 0;
  const esgMetrics = [
    {
      label: "Environmental",
      value: useLive ? overall.environmental : (scores?.avg_env ?? "–"),
      color: "var(--color-primary)",
    },
    {
      label: "Social",
      value: useLive ? overall.social : (scores?.avg_social ?? "–"),
      color: "var(--color-accent-teal)",
    },
    {
      label: "Governance",
      value: useLive ? overall.governance : (scores?.avg_gov ?? "–"),
      color: "var(--color-secondary)",
    },
    {
      label: "Overall ESG",
      value: useLive ? overall.overall : (scores?.avg_total ?? "–"),
      color: "var(--color-primary)",
    },
  ];

  return (
    <div>
      <header className="page-header">
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)", marginBottom: "var(--space-2)" }}>
          CEO
        </div>
        <h1>Executive ESG overview</h1>
        <p>
          Welcome, <span style={{ color: "var(--color-ink-secondary)", fontWeight: 600 }}>{userName}</span>.
          Company-wide ESG performance
          {useLive
            ? ` (weights E ${Math.round(overall.weights.environmental * 100)}% / S ${Math.round(overall.weights.social * 100)}% / G ${Math.round(overall.weights.governance * 100)}%).`
            : "."}
        </p>
      </header>

      <div className="stats-grid section-gap">
        {esgMetrics.map((m) => (
          <div key={m.label} className="stat-card">
            <div className="stat-label">{m.label}</div>
            <div className="stat-value" style={{ color: m.color }}>
              {m.value}
            </div>
            {typeof m.value === "number" && (
              <div className="stat-hint">out of 100</div>
            )}
          </div>
        ))}
      </div>

      <div className="charts-row section-gap">
        <ChartCard
          title="ESG pillar scores"
          subtitle={
            useLive
              ? `Weighted overall · E ${Math.round(overall.weights.environmental * 100)}% · S ${Math.round(overall.weights.social * 100)}% · G ${Math.round(overall.weights.governance * 100)}%`
              : "Company averages out of 100"
          }
        >
          <SimpleBarChart
            maxScale={100}
            data={[
              {
                label: "Environmental",
                value: Number(useLive ? overall.environmental : scores?.avg_env ?? 0),
                color: "#0075de",
              },
              {
                label: "Social",
                value: Number(useLive ? overall.social : scores?.avg_social ?? 0),
                color: "#2a9d99",
              },
              {
                label: "Governance",
                value: Number(useLive ? overall.governance : scores?.avg_gov ?? 0),
                color: "#dd5b00",
              },
              {
                label: "Overall",
                value: Number(useLive ? overall.overall : scores?.avg_total ?? 0),
                color: "#213183",
              },
            ]}
          />
        </ChartCard>
      </div>

      <section className="section-gap">
        <div className="card-header">Department ESG ranking</div>
        {topDepts.length === 0 ? (
          <div className="card" style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            No ESG scores recorded yet. Run the scoring engine to populate rankings.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr 120px",
                padding: "var(--space-3) var(--space-4)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-dim)",
                borderBottom: "1px solid var(--color-hairline)",
                background: "var(--color-bg)",
              }}
            >
              <span>Rank</span>
              <span>Department</span>
              <span style={{ textAlign: "right" }}>ESG score</span>
            </div>
            {topDepts.map((d, i) => (
              <div
                key={d.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr 120px",
                  padding: "var(--space-3) var(--space-4)",
                  fontSize: 14,
                  borderBottom: "1px solid var(--color-hairline)",
                  background: i === 0 ? "rgba(0,117,222,0.04)" : "transparent",
                }}
              >
                <span style={{ color: i === 0 ? "var(--color-primary)" : "var(--color-text-dim)", fontWeight: 600 }}>
                  {i + 1}
                </span>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{d.name}</span>
                <span
                  style={{
                    textAlign: "right",
                    color: i === 0 ? "var(--color-primary)" : "var(--color-text-muted)",
                    fontWeight: 600,
                  }}
                >
                  {d.total_score ?? "–"} / 100
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
