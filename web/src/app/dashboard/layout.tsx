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
      {/* ── SIDEBAR ── */}
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--color-primary)',
              letterSpacing: '0.04em',
            }}
          >
            [ECOSPHERE]
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-text-dim)',
              letterSpacing: '0.08em',
              marginTop: '2px',
            }}
          >
            ESG MANAGEMENT PLATFORM
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

        {/* Sidebar footer: user info + logout */}
        <div className="sidebar-footer">
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-dim)',
              lineHeight: '20px',
              marginBottom: 'var(--space-3)',
            }}
          >
            <div style={{ color: 'var(--color-primary)' }}>{userName}</div>
            <div>
              role:{' '}
              <span style={{ color: 'var(--color-secondary)' }}>
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
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-text-dim)',
            }}
          >
            <span style={{ color: 'var(--color-primary)' }}>ecosphere</span>
            <span style={{ color: 'var(--color-text-dim)' }}>@platform</span>
            <span style={{ color: 'var(--color-secondary)' }}>:~$</span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
            }}
          >
            <span>
              role:{' '}
              <span style={{ color: 'var(--color-secondary)' }}>
                {ROLE_LABELS[role] ?? role}
              </span>
            </span>
            <span style={{ color: 'var(--color-border-medium)' }}>|</span>
            <span style={{ color: 'var(--color-primary)' }}>{userName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
