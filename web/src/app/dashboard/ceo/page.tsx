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
    { label: "ENVIRONMENTAL SCORE", value: scores?.avg_env  ?? "–", color: "var(--color-primary)" },
    { label: "SOCIAL SCORE",        value: scores?.avg_social ?? "–", color: "var(--color-tertiary)" },
    { label: "GOVERNANCE SCORE",    value: scores?.avg_gov  ?? "–", color: "var(--color-secondary)" },
    { label: "OVERALL ESG SCORE",   value: scores?.avg_total ?? "–", color: "var(--color-primary)" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.1em", marginBottom: "4px" }}>
          # CEO / DASHBOARD
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          EXECUTIVE ESG OVERVIEW
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Welcome, <span style={{ color: "var(--color-secondary)" }}>{userName}</span>. Company-wide ESG performance.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {/* ESG Score cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
        {esgMetrics.map((m) => (
          <div key={m.label} className="stat-card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>
              {"// "}{m.label}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "32px", fontWeight: 700, color: m.color, lineHeight: 1.2 }}>
              {m.value}
            </div>
            {typeof m.value === "number" && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", marginTop: "4px" }}>
                / 100
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Department ranking */}
      <div>
        <div className="card-header">DEPARTMENT ESG RANKING</div>
        {topDepts.length === 0 ? (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-dim)", padding: "var(--space-4)", border: "1px solid var(--color-border-subtle)" }}>
            {"// No ESG scores recorded yet. Run the scoring engine to populate rankings."}
          </div>
        ) : (
          <div>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px", padding: "8px var(--space-4)", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", borderBottom: "1px dashed var(--color-border-subtle)", letterSpacing: "0.06em" }}>
              <span>RANK</span><span>DEPARTMENT</span><span style={{ textAlign: "right" }}>ESG SCORE</span>
            </div>
            {topDepts.map((d, i) => (
              <div key={d.name} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px", padding: "10px var(--space-4)", fontFamily: "var(--font-mono)", fontSize: "14px", borderBottom: "1px solid var(--color-border-subtle)", background: i === 0 ? "rgba(0,255,65,0.03)" : "transparent" }}>
                <span style={{ color: i === 0 ? "var(--color-primary)" : "var(--color-text-dim)" }}>
                  {i === 0 ? "#1" : `#${i + 1}`}
                </span>
                <span style={{ color: "var(--color-text-primary)" }}>{">"} {d.name}</span>
                <span style={{ textAlign: "right", color: i === 0 ? "var(--color-primary)" : "var(--color-text-muted)" }}>
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
