// Client hook — loads current role for hiding admin-only UI controls.
// Admin and CEO share identical full-access privileges.
'use client';

import { useEffect, useState } from 'react';
import type { UserRole } from '@/lib/accessControl';

export function useSessionRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (!cancelled && res.ok && json.success) {
          setRole(json.data.role as UserRole);
        }
      } catch {
        // leave role null
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isFullAccess = role === 'admin' || role === 'ceo';

  return {
    role,
    loading,
    // isAdmin = full platform access (admin OR ceo — same permissions)
    isAdmin: isFullAccess,
    isFullAccess,
    isManager: role === 'admin' || role === 'ceo' || role === 'departmental_head',
    isEmployee: role === 'employee',
    isPrivileged: isFullAccess,
  };
}
