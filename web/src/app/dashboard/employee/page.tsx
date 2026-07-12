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
    { label: "ESG POINTS",         value: stats?.esg_points_balance ?? 0, color: "var(--color-primary)", suffix: "pts" },
    { label: "TOTAL XP",           value: stats?.total_xp           ?? 0, color: "var(--color-secondary)", suffix: "xp" },
    { label: "CSR ACTIVITIES",     value: stats?.csr_participated   ?? 0, color: "var(--color-tertiary)", suffix: "" },
    { label: "CHALLENGES JOINED",  value: stats?.challenges_joined  ?? 0, color: "var(--color-primary)", suffix: "" },
    { label: "BADGES EARNED",      value: stats?.badges_earned      ?? 0, color: "var(--color-secondary)", suffix: "" },
    { label: "UNREAD ALERTS",      value: stats?.unread_notifications ?? 0, color: "var(--color-error)", suffix: "" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.1em", marginBottom: "4px" }}>
          # EMPLOYEE / DASHBOARD
        </div>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "4px" }}>
          SELF-SERVICE PORTAL
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-muted)" }}>
          Welcome back, <span style={{ color: "var(--color-secondary)" }}>{userName}</span>. Your ESG activity summary.
        </p>
      </div>

      <div style={{ color: "var(--color-border-medium)", fontFamily: "var(--font-mono)", fontSize: "12px", marginBottom: "var(--space-6)" }}>
        {"─".repeat(60)}
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-text-dim)", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>
              {"// "}{s.label}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: s.color, lineHeight: 1.2 }}>
              {s.value}
              {s.suffix && <span style={{ fontSize: "14px", color: "var(--color-text-dim)", marginLeft: "4px" }}>{s.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Recent notifications */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div className="card-header">RECENT NOTIFICATIONS</div>
        {notifications.length === 0 ? (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--color-text-dim)", padding: "var(--space-4)", border: "1px solid var(--color-border-subtle)" }}>
            {"// No notifications. All clear."}
          </div>
        ) : (
          <div>
            {notifications.map((n, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px var(--space-4)", borderBottom: "1px solid var(--color-border-subtle)", fontFamily: "var(--font-mono)", fontSize: "13px", background: n.is_read ? "transparent" : "rgba(0,255,65,0.02)" }}>
                <div>
                  <div style={{ color: n.is_read ? "var(--color-text-muted)" : "var(--color-text-primary)", marginBottom: "2px" }}>
                    {">"} {n.title}
                  </div>
                  <div style={{ color: "var(--color-text-dim)", fontSize: "11px" }}>{n.message}</div>
                </div>
                {!n.is_read && <span className="chip chip-green" style={{ flexShrink: 0, marginLeft: "var(--space-4)" }}>NEW</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <div className="card-header">QUICK ACTIONS</div>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {[
            { label: "Browse CSR Activities",  href: "/dashboard/social/csr" },
            { label: "Join a Challenge",        href: "/dashboard/gamification/challenges" },
            { label: "View Badges",             href: "/dashboard/gamification/badges" },
            { label: "Redeem Rewards",          href: "/dashboard/gamification/rewards" },
            { label: "Read Policies",           href: "/dashboard/governance/policies" },
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
