// src/app/dashboard/page.tsx
// Root /dashboard — redirects to role-specific dashboard via middleware.
// Middleware already redirects /dashboard/* based on role.
// This page is a fallback server component.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/auth";

const ROLE_PATHS: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  ceo: "/dashboard/ceo",
  departmental_head: "/dashboard/departmental-head",
  employee: "/dashboard/employee",
};

export default function DashboardIndexPage() {
  const headersList = headers();
  const role = (headersList.get("x-user-role") ?? "employee") as UserRole;
  redirect(ROLE_PATHS[role] ?? "/dashboard/employee");
}
