// src/app/dashboard/admin/page.tsx
// Admin Dashboard — full system access

import { headers } from "next/headers";
import pool from "@/config/db";
import type { RowDataPacket } from "mysql2";

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
        (SELECT COUNT(*) FROM compliance_issues WHERE status IN ('open','in_progress')) AS open_compliance,
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
    { label: "ACTIVE USERS",       value: stats?.total_users       ?? "–", color: "var(--color-primary)" },
    { label: "DEPARTMENTS",         value: stats?.total_departments ?? "–", color: "var(--color-tertiary)" },
    { label: "OPEN COMPLIANCE",     value: stats?.open_compliance   ?? "–", color: "var(--color-error)" },
    { label: "ACTIVE CHALLENGES",   value: stats?.active_challenges ?? "–", color: "var(--color-secondary)" },
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.1em", marginBottom: "4px" }}>
          # ADMIN / DASHBOARD
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          EXECUTIVE OVERVIEW
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Welcome, <span style={{ color: "var(--color-secondary)" }}>{userName}</span>. Full system access granted.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>
              // {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "32px", fontWeight: 700, color: s.color, lineHeight: 1.2 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div className="card-header">QUICK ACTIONS</div>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {[
            { label: "Manage Users",       href: "/dashboard/settings/users" },
            { label: "Log Carbon Data",    href: "/dashboard/environmental/carbon" },
            { label: "Start Challenge",    href: "/dashboard/gamification/challenges" },
            { label: "View Reports",       href: "/dashboard/reports" },
            { label: "Manage Departments", href: "/dashboard/settings/departments" },
          ].map((a) => (
            <a key={a.label} href={a.href} className="btn btn-secondary btn-md btn-cli">
              {a.label}
            </a>
          ))}
        </div>
      </div>

      {/* Module status */}
      <div>
        <div className="card-header">MODULE STATUS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-3)" }}>
          {[
            { module: "ENVIRONMENTAL",  status: "ONLINE", color: "var(--color-primary)" },
            { module: "SOCIAL / CSR",   status: "ONLINE", color: "var(--color-primary)" },
            { module: "GOVERNANCE",     status: "ONLINE", color: "var(--color-primary)" },
            { module: "GAMIFICATION",   status: "ONLINE", color: "var(--color-primary)" },
            { module: "REPORTS",        status: "ONLINE", color: "var(--color-primary)" },
            { module: "NOTIFICATIONS",  status: "ONLINE", color: "var(--color-primary)" },
            { module: "SETTINGS",       status: "ONLINE", color: "var(--color-primary)" },
          ].map((m) => (
            <div key={m.module} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px var(--space-4)", border: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
              <span style={{ color: "var(--color-text-muted)" }}>{">"} {m.module}</span>
              <span style={{ color: m.color }}>[{m.status}]</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
