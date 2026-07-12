// src/app/dashboard/ceo/page.tsx
// CEO Dashboard — executive ESG overview

import { headers } from "next/headers";
import pool from "@/config/db";
import type { RowDataPacket } from "mysql2";

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
  const { scores, topDepts } = await getCEOStats();

  const esgMetrics = [
    { label: "Environmental", value: scores?.avg_env  ?? "–", color: "var(--color-primary)" },
    { label: "Social",        value: scores?.avg_social ?? "–", color: "var(--color-accent-teal)" },
    { label: "Governance",    value: scores?.avg_gov  ?? "–", color: "var(--color-secondary)" },
    { label: "Overall ESG",   value: scores?.avg_total ?? "–", color: "var(--color-primary)" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)", marginBottom: 6 }}>CEO</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--color-text-primary)", marginBottom: 6 }}>
          Executive ESG overview
        </h1>
        <p style={{ fontSize: 15, color: "var(--color-text-muted)" }}>
          Welcome, <span style={{ color: "var(--color-ink-secondary)", fontWeight: 600 }}>{userName}</span>. Company-wide ESG performance.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
        {esgMetrics.map((m) => (
          <div key={m.label} className="stat-card">
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}>
              {m.label}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px", color: m.color, lineHeight: 1.2 }}>
              {m.value}
            </div>
            {typeof m.value === "number" && (
              <div style={{ fontSize: 12, color: "var(--color-text-dim)", marginTop: 4 }}>/ 100</div>
            )}
          </div>
        ))}
      </div>

      <div>
        <div className="card-header">Department ESG ranking</div>
        {topDepts.length === 0 ? (
          <div className="card" style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            No ESG scores recorded yet. Run the scoring engine to populate rankings.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px", padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "var(--color-text-dim)", borderBottom: "1px solid var(--color-hairline)", background: "var(--color-bg)" }}>
              <span>Rank</span><span>Department</span><span style={{ textAlign: "right" }}>ESG score</span>
            </div>
            {topDepts.map((d, i) => (
              <div key={d.name} style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px", padding: "12px 16px", fontSize: 14, borderBottom: "1px solid var(--color-hairline)", background: i === 0 ? "rgba(0,117,222,0.04)" : "transparent" }}>
                <span style={{ color: i === 0 ? "var(--color-primary)" : "var(--color-text-dim)", fontWeight: 600 }}>
                  {i + 1}
                </span>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{d.name}</span>
                <span style={{ textAlign: "right", color: i === 0 ? "var(--color-primary)" : "var(--color-text-muted)", fontWeight: 600 }}>
                  {d.total_score ?? "–"} / 100
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
