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
    { label: "Employees", value: stats?.employee_count ?? "–", color: "var(--color-primary)" },
    { label: "Active goals", value: stats?.open_goals ?? "–", color: "var(--color-accent-teal)" },
    { label: "Pending CSR", value: stats?.pending_csr ?? "–", color: "var(--color-warning)" },
    { label: "Open compliance", value: stats?.open_compliance ?? "–", color: "var(--color-error)" },
  ];

  return (
    <div>
      <header className="page-header">
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)", marginBottom: "var(--space-2)" }}>
          Department head
        </div>
        <h1>Department control</h1>
        <p>
          Welcome, <span style={{ color: "var(--color-ink-secondary)", fontWeight: 600 }}>{userName}</span>.
          {stats?.dept_name && (
            <> Department: <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{stats.dept_name}</span></>
          )}
        </p>
      </header>

      <div className="stats-grid section-gap">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <section>
        <div className="card-header">Quick actions</div>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {[
            { label: "Review CSR Participations", href: "/dashboard/social/participation" },
            { label: "View Environmental Goals", href: "/dashboard/environmental/goals" },
            { label: "Log Carbon Data", href: "/dashboard/environmental/carbon" },
            { label: "View Compliance Issues", href: "/dashboard/governance/compliance" },
          ].map((a) => (
            <a key={a.label} href={a.href} className="btn btn-secondary btn-md">
              {a.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
