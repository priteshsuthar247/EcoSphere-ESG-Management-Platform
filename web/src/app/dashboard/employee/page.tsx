// src/app/dashboard/employee/page.tsx
// Employee Self-Service Dashboard

import { headers } from "next/headers";
import pool from "@/config/db";
import type { RowDataPacket } from "mysql2";

interface EmpStats extends RowDataPacket {
  esg_points_balance: number;
  total_xp: number;
  csr_participated: number;
  challenges_joined: number;
  badges_earned: number;
  unread_notifications: number;
}

async function getEmployeeStats(userId: string) {
  try {
    const [rows] = await pool.execute<EmpStats[]>(`
      SELECT
        u.esg_points_balance,
        u.total_xp,
        (SELECT COUNT(*) FROM employee_csr_participations WHERE user_id = u.id) AS csr_participated,
        (SELECT COUNT(*) FROM challenge_participations WHERE user_id = u.id) AS challenges_joined,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) AS badges_earned,
        (SELECT COUNT(*) FROM notifications WHERE user_id = u.id AND is_read = 0) AS unread_notifications
      FROM users u
      WHERE u.id = ?
      LIMIT 1
    `, [userId]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function getRecentNotifications(userId: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT title, message, type, created_at, is_read
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);
    return rows;
  } catch {
    return [];
  }
}

export default async function EmployeeDashboard() {
  const headersList = headers();
  const userName = headersList.get("x-user-name") ?? "Employee";
  const userId   = headersList.get("x-user-id") ?? "0";

  const [stats, notifications] = await Promise.all([
    getEmployeeStats(userId),
    getRecentNotifications(userId),
  ]);

  const statCards = [
    { label: "ESG points", value: stats?.esg_points_balance ?? 0, color: "var(--color-primary)", suffix: "pts" },
    { label: "Total XP", value: stats?.total_xp ?? 0, color: "var(--color-warning)", suffix: "xp" },
    { label: "CSR activities", value: stats?.csr_participated ?? 0, color: "var(--color-accent-teal)", suffix: "" },
    { label: "Challenges joined", value: stats?.challenges_joined ?? 0, color: "var(--color-primary)", suffix: "" },
    { label: "Badges earned", value: stats?.badges_earned ?? 0, color: "var(--color-secondary)", suffix: "" },
    { label: "Unread alerts", value: stats?.unread_notifications ?? 0, color: "var(--color-error)", suffix: "" },
  ];

  return (
    <div>
      <header className="page-header">
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)", marginBottom: "var(--space-2)" }}>
          Employee
        </div>
        <h1>Your workspace</h1>
        <p>
          Welcome back, <span style={{ color: "var(--color-ink-secondary)", fontWeight: 600 }}>{userName}</span>. Your ESG activity summary.
        </p>
      </header>

      <div className="stats-grid section-gap">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
              {s.suffix && (
                <span style={{ fontSize: 14, color: "var(--color-text-dim)", marginLeft: 4, fontWeight: 500 }}>
                  {s.suffix}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <section className="section-gap">
        <div className="card-header">Recent notifications</div>
        {notifications.length === 0 ? (
          <div className="card" style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            No notifications. You’re all caught up.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {notifications.map((n, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "var(--space-3) var(--space-4)",
                  borderBottom: "1px solid var(--color-hairline)",
                  fontSize: 14,
                  background: n.is_read ? "transparent" : "rgba(0,117,222,0.04)",
                }}
              >
                <div>
                  <div style={{ color: n.is_read ? "var(--color-text-muted)" : "var(--color-text-primary)", fontWeight: 600, marginBottom: 2 }}>
                    {n.title}
                  </div>
                  <div style={{ color: "var(--color-text-dim)", fontSize: 13 }}>{n.message}</div>
                </div>
                {!n.is_read && (
                  <span className="chip chip-cyan" style={{ flexShrink: 0, marginLeft: "var(--space-4)" }}>
                    New
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div>
        <div className="card-header">Quick actions</div>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {[
            { label: "Browse CSR Activities",  href: "/dashboard/social/csr" },
            { label: "Join a Challenge",        href: "/dashboard/gamification/challenges" },
            { label: "View Badges",             href: "/dashboard/gamification/badges" },
            { label: "Redeem Rewards",          href: "/dashboard/gamification/rewards" },
            { label: "Read Policies",           href: "/dashboard/governance/policies" },
          ].map((a) => (
            <a key={a.label} href={a.href} className="btn btn-secondary btn-md">
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
