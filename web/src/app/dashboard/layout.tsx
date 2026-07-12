// src/app/dashboard/layout.tsx
// Shared dashboard shell: sidebar + topbar for all role dashboards.
// User info is read from request headers injected by middleware.

import { headers } from "next/headers";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import type { UserRole } from "@/lib/auth";

// Nav items visible per role
const NAV_SECTIONS: {
  section: string;
  items: { label: string; href: string; roles: UserRole[] }[];
}[] = [
  {
    section: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/dashboard", roles: ["admin", "ceo", "departmental_head", "employee"] }],
  },
  {
    section: "ENVIRONMENTAL",
    items: [
      { label: "Emission Factors", href: "/dashboard/environmental/emissions", roles: ["admin", "ceo", "departmental_head"] },
      { label: "Product ESG Profiles", href: "/dashboard/environmental/products", roles: ["admin", "ceo"] },
      { label: "Carbon Transactions", href: "/dashboard/environmental/carbon", roles: ["admin", "ceo", "departmental_head"] },
      { label: "Environmental Goals", href: "/dashboard/environmental/goals", roles: ["admin", "ceo", "departmental_head"] },
    ],
  },
  {
    section: "SOCIAL",
    items: [
      { label: "CSR Activities", href: "/dashboard/social/csr", roles: ["admin", "ceo", "departmental_head", "employee"] },
      { label: "Employee Participation", href: "/dashboard/social/participation", roles: ["admin", "ceo", "departmental_head", "employee"] },
      { label: "Diversity Dashboard", href: "/dashboard/social/diversity", roles: ["admin", "ceo"] },
    ],
  },
  {
    section: "GOVERNANCE",
    items: [
      { label: "Policies", href: "/dashboard/governance/policies", roles: ["admin", "ceo", "departmental_head", "employee"] },
      { label: "Policy Acknowledgements", href: "/dashboard/governance/acknowledgements", roles: ["admin", "ceo", "departmental_head"] },
      { label: "Audits", href: "/dashboard/governance/audits", roles: ["admin", "ceo"] },
      { label: "Compliance Issues", href: "/dashboard/governance/compliance", roles: ["admin", "ceo", "departmental_head"] },
    ],
  },
  {
    section: "GAMIFICATION",
    items: [
      { label: "Challenges", href: "/dashboard/gamification/challenges", roles: ["admin", "ceo", "departmental_head", "employee"] },
      { label: "Challenge Participation", href: "/dashboard/gamification/participation", roles: ["admin", "departmental_head", "employee"] },
      { label: "Badges", href: "/dashboard/gamification/badges", roles: ["admin", "ceo", "departmental_head", "employee"] },
      { label: "Rewards", href: "/dashboard/gamification/rewards", roles: ["admin", "ceo", "departmental_head", "employee"] },
      { label: "Leaderboard", href: "/dashboard/gamification/leaderboard", roles: ["admin", "ceo", "departmental_head", "employee"] },
    ],
  },
  {
    section: "REPORTS",
    items: [
      { label: "ESG Summary", href: "/dashboard/reports", roles: ["admin", "ceo"] },
      { label: "Custom Report Builder", href: "/dashboard/reports/builder", roles: ["admin", "ceo"] },
    ],
  },
  {
    section: "SETTINGS",
    items: [
      { label: "User Management", href: "/dashboard/settings/users", roles: ["admin"] },
      { label: "Departments", href: "/dashboard/settings/departments", roles: ["admin"] },
      { label: "Categories", href: "/dashboard/settings/categories", roles: ["admin"] },
      { label: "ESG Configuration", href: "/dashboard/settings/esg-config", roles: ["admin"] },
      { label: "Notification Settings", href: "/dashboard/settings/notifications", roles: ["admin"] },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "ADMIN",
  ceo: "CEO",
  departmental_head: "DEPT HEAD",
  employee: "EMPLOYEE",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const role = (headersList.get("x-user-role") ?? "employee") as UserRole;
  const userName = headersList.get("x-user-name") ?? "Unknown";

  return (
    <div className="dashboard-layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--color-primary)",
              letterSpacing: "0.04em",
            }}
          >
            [ECOSPHERE]
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--color-text-dim)",
              letterSpacing: "0.08em",
              marginTop: "2px",
            }}
          >
            ESG MANAGEMENT PLATFORM
          </div>
        </div>

        {/* Nav sections */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => {
            const visible = section.items.filter((item) =>
              item.roles.includes(role)
            );
            if (!visible.length) return null;
            return (
              <div key={section.section}>
                <div className="nav-section-label">{section.section}</div>
                {visible.map((item) => (
                  <Link key={item.href} href={item.href} className="nav-item">
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer: user info + logout */}
        <div className="sidebar-footer">
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-dim)",
              lineHeight: "20px",
              marginBottom: "var(--space-3)",
            }}
          >
            <div style={{ color: "var(--color-primary)" }}>{userName}</div>
            <div>
              role:{" "}
              <span style={{ color: "var(--color-secondary)" }}>
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="dashboard-main">
        {/* Topbar */}
        <header className="topbar">
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--color-text-dim)",
            }}
          >
            <span style={{ color: "var(--color-primary)" }}>ecosphere</span>
            <span style={{ color: "var(--color-text-dim)" }}>@platform</span>
            <span style={{ color: "var(--color-secondary)" }}>:~$</span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-dim)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <span>
              role:{" "}
              <span style={{ color: "var(--color-secondary)" }}>
                {ROLE_LABELS[role] ?? role}
              </span>
            </span>
            <span style={{ color: "var(--color-border-medium)" }}>|</span>
            <span style={{ color: "var(--color-primary)" }}>{userName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
