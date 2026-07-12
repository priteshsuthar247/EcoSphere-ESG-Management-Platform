// src/app/dashboard/layout.tsx
// Shared dashboard shell: sidebar + topbar for all role dashboards.
// User info is read from request headers injected by middleware.
// Nav items are filtered strictly by role (employees see only allowed modules).

import { headers } from 'next/headers';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { getVisibleNav, getRoleHome, type UserRole } from '@/lib/accessControl';

// Always re-evaluate role headers — never cache admin nav for an employee session
export const dynamic = 'force-dynamic';

const ROLE_LABELS: Record<string, string> = {
  admin: 'ADMIN',
  ceo: 'CEO',
  departmental_head: 'DEPT HEAD',
  employee: 'EMPLOYEE',
};

const VALID_ROLES: UserRole[] = ['admin', 'ceo', 'departmental_head', 'employee'];

function normalizeRole(raw: string | null): UserRole {
  if (raw && VALID_ROLES.includes(raw as UserRole)) {
    return raw as UserRole;
  }
  // Fail closed: unknown / missing role → employee (least privilege)
  return 'employee';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const role = normalizeRole(headersList.get('x-user-role'));
  const userName = headersList.get('x-user-name') ?? 'Unknown';
  const visibleSections = getVisibleNav(role);
  const homeHref = getRoleHome(role);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-logo">
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            EcoSphere
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              color: "var(--color-text-dim)",
              marginTop: "2px",
            }}
          >
            ESG Management
          </div>
        </div>

        {/* Nav sections — role-filtered */}
        <nav className="sidebar-nav">
          {visibleSections.map((section) => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map((item) => {
                // Point "Dashboard" at role home so employees never hit /dashboard redirect flash oddly
                const href = item.href === '/dashboard' ? homeHref : item.href;
                return (
                  <Link key={item.href} href={href} className="nav-item">
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              color: "var(--color-text-muted)",
              lineHeight: "1.5",
              marginBottom: "var(--space-3)",
            }}
          >
            <div style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{userName}</div>
            <div>
              {ROLE_LABELS[role] ?? role}
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
              color: "var(--color-text-muted)",
              fontWeight: 500,
            }}
          >
            Workspace
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <span className="chip chip-cyan">{ROLE_LABELS[role] ?? role}</span>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{userName}</span>
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
