// src/app/dashboard/page.tsx
// Root /dashboard — redirects to role-specific dashboard via middleware.
// Fallback if middleware did not redirect.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRoleHome, type UserRole } from "@/lib/accessControl";

export const dynamic = "force-dynamic";

const VALID: UserRole[] = ["admin", "ceo", "departmental_head", "employee"];

export default function DashboardIndexPage() {
  const headersList = headers();
  const raw = headersList.get("x-user-role");
  const role: UserRole =
    raw && VALID.includes(raw as UserRole) ? (raw as UserRole) : "employee";
  redirect(getRoleHome(role));
}
