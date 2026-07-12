// src/app/dashboard/departmental-head/page.tsx
// Departmental Head Dashboard

import { headers } from "next/headers";
import pool from "@/config/db";
import type { RowDataPacket } from "mysql2";

interface DeptStats extends RowDataPacket {
  dept_name: string | null;
  employee_count: number;
  open_goals: number;
  pending_csr: number;
  open_compliance: number;
}

async function getDeptHeadStats(userId: string) {
  try {
    const [rows] = await pool.execute<DeptStats[]>(`
      SELECT
        d.name AS dept_name,
        d.employee_count,
        (SELECT COUNT(*) FROM environmental_goals g WHERE g.department_id = d.id AND g.status = 'active') AS open_goals,
        (SELECT COUNT(*) FROM employee_csr_participations p
          JOIN users u ON u.id = p.user_id
          WHERE u.department_id = d.id AND p.approval_status = 'pending') AS pending_csr,
        (SELECT COUNT(*) FROM compliance_issues ci WHERE ci.department_id = d.id AND ci.status IN ('open','in_progress')) AS open_compliance
      FROM users u
      JOIN departments d ON d.id = u.department_id
      WHERE u.id = ?
      LIMIT 1
    `, [userId]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export default async function DeptHeadDashboard() {
  const headersList = headers();
  const userName = headersList.get("x-user-name") ?? "Department Head";
  const userId   = headersList.get("x-user-id") ?? "0";
  const stats = await getDeptHeadStats(userId);

  const statCards = [
    { label: "EMPLOYEES",        value: stats?.employee_count  ?? "–", color: "var(--color-primary)" },
    { label: "ACTIVE GOALS",     value: stats?.open_goals      ?? "–", color: "var(--color-tertiary)" },
    { label: "PENDING CSR",      value: stats?.pending_csr     ?? "–", color: "var(--color-secondary)" },
    { label: "OPEN COMPLIANCE",  value: stats?.open_compliance ?? "–", color: "var(--color-error)" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.1em", marginBottom: "4px" }}>
          # DEPARTMENTAL HEAD / DASHBOARD
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          DEPARTMENT CONTROL
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Welcome, <span style={{ color: "var(--color-secondary)" }}>{userName}</span>.
          {stats?.dept_name && (
            <> Department: <span style={{ color: "var(--color-tertiary)" }}>{stats.dept_name}</span></>
          )}
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>
              {"// "}{s.label}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "32px", fontWeight: 700, color: s.color, lineHeight: 1.2 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <div className="card-header">QUICK ACTIONS</div>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {[
            { label: "Review CSR Participations", href: "/dashboard/social/participation" },
            { label: "View Environmental Goals",  href: "/dashboard/environmental/goals" },
            { label: "Log Carbon Data",            href: "/dashboard/environmental/carbon" },
            { label: "View Compliance Issues",     href: "/dashboard/governance/compliance" },
          ].map((a) => (
            <a key={a.label} href={a.href} className="btn btn-secondary btn-md btn-cli">
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
