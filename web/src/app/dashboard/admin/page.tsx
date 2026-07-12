// Admin Dashboard — Notion-inspired daylight UI

import { headers } from "next/headers";
import pool from "@/config/db";
import type { RowDataPacket } from "mysql2";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import StatCard, { StatsGrid } from "@/components/ui/StatCard";
import SectionTitle from "@/components/ui/SectionTitle";

interface Stats extends RowDataPacket {
  total_users: number;
  total_departments: number;
  open_compliance: number;
  active_challenges: number;
}

async function getAdminStats(): Promise<Stats | null> {
  try {
    const [rows] = await pool.execute<Stats[]>(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE status = 'active') AS total_users,
        (SELECT COUNT(*) FROM departments WHERE status = 'active') AS total_departments,
        (SELECT COUNT(*) FROM compliance_issues WHERE status IN ('open','in_progress','overdue')) AS open_compliance,
        (SELECT COUNT(*) FROM challenges WHERE status = 'active') AS active_challenges
    `);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export default async function AdminDashboard() {
  const headersList = headers();
  const userName = headersList.get("x-user-name") ?? "Administrator";
  const stats = await getAdminStats();

  const statCards = [
    { label: "Active users", value: stats?.total_users ?? "–", color: "var(--color-primary)" },
    { label: "Departments", value: stats?.total_departments ?? "–", color: "var(--color-accent-teal)" },
    { label: "Open compliance", value: stats?.open_compliance ?? "–", color: "var(--color-error)" },
    { label: "Active challenges", value: stats?.active_challenges ?? "–", color: "var(--color-warning)" },
  ];

  const actions = [
    { label: "Log carbon data", href: "/dashboard/environmental/carbon" },
    { label: "Start challenge", href: "/dashboard/gamification/challenges" },
    { label: "View reports", href: "/dashboard/reports" },
    { label: "Manage departments", href: "/dashboard/settings/departments" },
  ];

  const modules = [
    "Environmental",
    "Social / CSR",
    "Governance",
    "Gamification",
    "Reports",
    "Settings",
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Executive overview"
        description={`Welcome, ${userName}. Full system access.`}
      />

      <StatsGrid>
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </StatsGrid>

      <section className="section-gap">
        <SectionTitle>Quick actions</SectionTitle>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {actions.map((a) => (
            <Link key={a.label} href={a.href} className="btn btn-secondary btn-md">
              {a.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Module status</SectionTitle>
        <div className="responsive-grid-2">
          {modules.map((m) => (
            <div
              key={m}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--space-3) var(--space-4)",
                border: "1px solid var(--color-hairline)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface)",
                fontSize: 14,
              }}
            >
              <span style={{ color: "var(--color-ink-secondary)", fontWeight: 500 }}>{m}</span>
              <span className="chip chip-green">Online</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
