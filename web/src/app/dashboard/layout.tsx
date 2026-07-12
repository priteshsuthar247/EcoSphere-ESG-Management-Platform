// src/app/dashboard/layout.tsx
// Shared dashboard shell: role-filtered nav + collapsible sidebar.

import { headers } from "next/headers";
import DashboardShell from "@/components/DashboardShell";
import { getVisibleNav, getRoleHome, type UserRole } from "@/lib/accessControl";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  ceo: "CEO",
  departmental_head: "Dept Head",
  employee: "Employee",
};

const VALID_ROLES: UserRole[] = ["admin", "ceo", "departmental_head", "employee"];

function normalizeRole(raw: string | null): UserRole {
  if (raw && VALID_ROLES.includes(raw as UserRole)) return raw as UserRole;
  return "employee";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const role = normalizeRole(headersList.get("x-user-role"));
  const userName = headersList.get("x-user-name") ?? "Unknown";
  const visibleSections = getVisibleNav(role);
  const homeHref = getRoleHome(role);

  return (
    <DashboardShell
      roleLabel={ROLE_LABELS[role] ?? role}
      userName={userName}
      homeHref={homeHref}
      sections={visibleSections}
    >
      {children}
    </DashboardShell>
  );
}
