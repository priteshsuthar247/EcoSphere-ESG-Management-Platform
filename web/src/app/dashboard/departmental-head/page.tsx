// src/app/dashboard/departmental-head/page.tsx
// Departmental Head Dashboard

import { headers } from "next/headers";
import pool from "@/config/db";
import type { RowDataPacket } from "mysql2";
import PageHeader from "@/components/ui/PageHeader";
import StatCard, { StatsGrid } from "@/components/ui/StatCard";
import SectionTitle from "@/components/ui/SectionTitle";

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
      <PageHeader
        eyebrow="Department head"
        title="Department control"
        description={
          stats?.dept_name
            ? `Welcome, ${userName}. Department: ${stats.dept_name}`
            : `Welcome, ${userName}.`
        }
      />

      <StatsGrid>
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </StatsGrid>

      <section>
        <SectionTitle>Quick actions</SectionTitle>
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
