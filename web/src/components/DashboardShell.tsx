"use client";
// Client shell: collapsible sidebar + full-width main area
// Collapsed: narrow icon rail (SVG only) + logout

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import type { NavSection } from "@/lib/accessControl";

type Props = {
  roleLabel: string;
  userName: string;
  homeHref: string;
  sections: NavSection[];
  children: ReactNode;
};

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Section → SVG icon paths */
function SectionIcon({ section }: { section: string }) {
  switch (section) {
    case "OVERVIEW":
      return (
        <Icon>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </Icon>
      );
    case "ENVIRONMENTAL":
      return (
        <Icon>
          <path d="M12 3c-2.5 4-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-3.5-7-6-11z" />
          <path d="M12 14v4" />
        </Icon>
      );
    case "SOCIAL":
      return (
        <Icon>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Icon>
      );
    case "GOVERNANCE":
      return (
        <Icon>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Icon>
      );
    case "GAMIFICATION":
      return (
        <Icon>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </Icon>
      );
    case "REPORTS":
      return (
        <Icon>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </Icon>
      );
    case "SETTINGS":
      return (
        <Icon>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Icon>
      );
    default:
      return (
        <Icon>
          <circle cx="12" cy="12" r="8" />
        </Icon>
      );
  }
}

function ChevronIcon({ expand }: { expand: boolean }) {
  return (
    <Icon size={18}>
      {expand ? (
        <polyline points="9 18 15 12 9 6" />
      ) : (
        <polyline points="15 18 9 12 15 6" />
      )}
    </Icon>
  );
}

export default function DashboardShell({
  roleLabel,
  userName,
  homeHref,
  sections,
  children,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ecosphere-sidebar-collapsed");
      if (saved === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("ecosphere-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function sectionHref(section: NavSection): string {
    const first = section.items[0];
    if (!first) return homeHref;
    return first.href === "/dashboard" ? homeHref : first.href;
  }

  // On mobile drawer, always show full expanded menu
  const showCollapsedRail = collapsed && !mobileOpen;

  return (
    <div
      className={`dashboard-layout${showCollapsedRail ? " sidebar-collapsed" : ""}${
        mobileOpen ? " sidebar-mobile-open" : ""
      }`}
    >
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-logo">
          {showCollapsedRail ? (
            <div className="sidebar-logo-collapsed">
              {/* No brand/ERP logo when collapsed — only expand control */}
              <button
                type="button"
                className="sidebar-collapse-btn"
                onClick={toggleCollapsed}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <ChevronIcon expand />
              </button>
            </div>
          ) : (
            <>
              <div className="sidebar-logo-text">
                <div className="sidebar-brand">EcoSphere</div>
                <div className="sidebar-subbrand">ESG Management</div>
              </div>
              <button
                type="button"
                className="sidebar-collapse-btn"
                onClick={toggleCollapsed}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronIcon expand={false} />
              </button>
            </>
          )}
        </div>

        <nav className="sidebar-nav">
          {showCollapsedRail
            ? sections.map((section) => {
                const href = sectionHref(section);
                return (
                  <Link
                    key={section.section}
                    href={href}
                    className="nav-item nav-item-icon"
                    title={section.section}
                    onClick={() => setMobileOpen(false)}
                  >
                    <SectionIcon section={section.section} />
                    <span className="sr-only">{section.section}</span>
                  </Link>
                );
              })
            : sections.map((section) => (
                <div key={section.section} className="nav-section-block">
                  <div className="nav-section-label">{section.section}</div>
                  {section.items.map((item) => {
                    const href = item.href === "/dashboard" ? homeHref : item.href;
                    return (
                      <Link
                        key={item.href}
                        href={href}
                        className="nav-item"
                        title={item.label}
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
        </nav>

        <div className="sidebar-footer">
          {!showCollapsedRail && (
            <div className="sidebar-user">
              <div className="sidebar-user-name">{userName}</div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
          )}
          <LogoutButton collapsed={showCollapsedRail} />
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="sidebar-mobile-toggle"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <span className="topbar-workspace">Workspace</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-username">{userName}</span>
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
