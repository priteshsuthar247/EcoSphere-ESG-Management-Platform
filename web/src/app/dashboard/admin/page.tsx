// Admin Dashboard — Notion-inspired daylight UI

import { headers } from "next/headers";
import pool from "@/config/db";
import type { RowDataPacket } from "mysql2";
import Link from "next/link";

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
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-primary)",
            marginBottom: 6,
          }}
        >
          Admin
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "var(--color-text-primary)",
            marginBottom: 6,
          }}
        >
          Executive overview
        </h1>
        <p style={{ fontSize: 15, color: "var(--color-text-muted)" }}>
          Welcome, <span style={{ color: "var(--color-ink-secondary)", fontWeight: 600 }}>{userName}</span>.
          Full system access.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-dim)",
                marginBottom: "var(--space-2)",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: "-0.5px",
                color: s.color,
                lineHeight: 1.2,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "var(--space-8)" }}>
        <div className="card-header">Quick actions</div>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {actions.map((a) => (
            <Link key={a.label} href={a.href} className="btn btn-secondary btn-md">
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="card-header">Module status</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          {modules.map((m) => (
            <div
              key={m}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
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
      </div>
    </div>
  );
}
