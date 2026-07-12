// src/lib/accessControl.ts
// Single source of truth for role → navigation and route access.
// Edge-safe: no Node-only imports (used by middleware).
//
// Role model:
//   admin + ceo          → same full platform access (all modules + settings)
//   departmental_head    → operational modules (no settings, no products/diversity/audits/reports)
//   employee             → self-service only

export type UserRole = 'admin' | 'ceo' | 'departmental_head' | 'employee';

/** Admin and CEO share identical full platform privileges */
export const FULL_ACCESS_ROLES: UserRole[] = ['admin', 'ceo'];

export const MANAGER_ROLES: UserRole[] = ['admin', 'ceo', 'departmental_head'];

export const ALL_ROLES: UserRole[] = ['admin', 'ceo', 'departmental_head', 'employee'];

export type NavItem = {
  label: string;
  href: string;
  roles: UserRole[];
};

export type NavSection = {
  section: string;
  items: NavItem[];
};

/**
 * Sidebar navigation — only items whose `roles` include the current user role
 * are shown.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    section: 'OVERVIEW',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        roles: ALL_ROLES,
      },
    ],
  },
  {
    section: 'ENVIRONMENTAL',
    items: [
      {
        label: 'Emission Factors',
        href: '/dashboard/environmental/emissions',
        roles: MANAGER_ROLES,
      },
      {
        label: 'Product ESG Profiles',
        href: '/dashboard/environmental/products',
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: 'Carbon Transactions',
        href: '/dashboard/environmental/carbon',
        roles: MANAGER_ROLES,
      },
      {
        label: 'Environmental Goals',
        href: '/dashboard/environmental/goals',
        roles: MANAGER_ROLES,
      },
    ],
  },
  {
    section: 'SOCIAL',
    items: [
      {
        label: 'CSR Activities',
        href: '/dashboard/social/csr',
        roles: ALL_ROLES,
      },
      {
        label: 'My Participation',
        href: '/dashboard/social/participation',
        roles: ALL_ROLES,
      },
      {
        label: 'Diversity Dashboard',
        href: '/dashboard/social/diversity',
        roles: FULL_ACCESS_ROLES,
      },
    ],
  },
  {
    section: 'GOVERNANCE',
    items: [
      {
        label: 'Policies',
        href: '/dashboard/governance/policies',
        roles: ALL_ROLES,
      },
      {
        label: 'Policy Acknowledgements',
        href: '/dashboard/governance/acknowledgements',
        roles: MANAGER_ROLES,
      },
      {
        label: 'Audits',
        href: '/dashboard/governance/audits',
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: 'Compliance Issues',
        href: '/dashboard/governance/compliance',
        roles: MANAGER_ROLES,
      },
    ],
  },
  {
    section: 'GAMIFICATION',
    items: [
      {
        label: 'Challenges',
        href: '/dashboard/gamification/challenges',
        roles: ALL_ROLES,
      },
      {
        label: 'Challenge Approvals',
        href: '/dashboard/gamification/participation',
        roles: MANAGER_ROLES,
      },
      {
        label: 'Badges',
        href: '/dashboard/gamification/badges',
        roles: ALL_ROLES,
      },
      {
        label: 'Rewards',
        href: '/dashboard/gamification/rewards',
        roles: ALL_ROLES,
      },
      {
        label: 'Leaderboard',
        href: '/dashboard/gamification/leaderboard',
        roles: ALL_ROLES,
      },
    ],
  },
  {
    section: 'REPORTS',
    items: [
      {
        label: 'ESG Summary',
        href: '/dashboard/reports',
        roles: FULL_ACCESS_ROLES,
      },
      {
        label: 'Custom Report Builder',
        href: '/dashboard/reports/builder',
        roles: FULL_ACCESS_ROLES,
      },
    ],
  },
  {
    section: 'SETTINGS',
    // Admin and CEO have the same settings access
    items: [
      { label: 'User Management', href: '/dashboard/settings/users', roles: FULL_ACCESS_ROLES },
      { label: 'Departments', href: '/dashboard/settings/departments', roles: FULL_ACCESS_ROLES },
      { label: 'Categories', href: '/dashboard/settings/categories', roles: FULL_ACCESS_ROLES },
      { label: 'ESG Configuration', href: '/dashboard/settings/esg-config', roles: FULL_ACCESS_ROLES },
      { label: 'Notification Settings', href: '/dashboard/settings/notifications', roles: FULL_ACCESS_ROLES },
    ],
  },
];

/** Home dashboard path per role */
export function getRoleHome(role: UserRole): string {
  const map: Record<UserRole, string> = {
    admin: '/dashboard/admin',
    ceo: '/dashboard/ceo',
    departmental_head: '/dashboard/departmental-head',
    employee: '/dashboard/employee',
  };
  return map[role] ?? '/dashboard/employee';
}

/** Shared full-access path list (admin === ceo) */
const FULL_ACCESS_PREFIXES = [
  '/dashboard/admin',
  '/dashboard/ceo',
  '/dashboard/departmental-head',
  '/dashboard/employee',
  '/dashboard/settings',
  '/dashboard/environmental',
  '/dashboard/social',
  '/dashboard/governance',
  '/dashboard/gamification',
  '/dashboard/reports',
];

/**
 * Explicit allowed dashboard path prefixes per role.
 */
export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  admin: FULL_ACCESS_PREFIXES,
  // CEO has the same route access as admin
  ceo: FULL_ACCESS_PREFIXES,
  departmental_head: [
    '/dashboard/departmental-head',
    '/dashboard/employee',
    '/dashboard/environmental/emissions',
    '/dashboard/environmental/carbon',
    '/dashboard/environmental/goals',
    '/dashboard/social/csr',
    '/dashboard/social/participation',
    '/dashboard/governance/policies',
    '/dashboard/governance/acknowledgements',
    '/dashboard/governance/compliance',
    '/dashboard/gamification',
  ],
  employee: [
    '/dashboard/employee',
    '/dashboard/social/csr',
    '/dashboard/social/participation',
    '/dashboard/governance/policies',
    '/dashboard/gamification/challenges',
    '/dashboard/gamification/badges',
    '/dashboard/gamification/rewards',
    '/dashboard/gamification/leaderboard',
  ],
};

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const prefixes = ROLE_ALLOWED_PREFIXES[role] ?? [];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'),
  );
}

export function getVisibleNav(role: UserRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    section: section.section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}

/** Admin + CEO — full platform privileges (identical) */
export function isFullAccessRole(role: UserRole | string | null | undefined): boolean {
  return role === 'admin' || role === 'ceo';
}

/** Alias kept for call sites that said "admin" but now mean full access */
export function isAdminRole(role: UserRole | string | null | undefined): boolean {
  return isFullAccessRole(role);
}

/** Roles that can manage / approve operational work */
export function isManagerRole(role: UserRole | string | null | undefined): boolean {
  return role === 'admin' || role === 'ceo' || role === 'departmental_head';
}

export function isPrivilegedRole(role: UserRole | string | null | undefined): boolean {
  return isFullAccessRole(role);
}
