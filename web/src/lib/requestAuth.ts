// src/lib/requestAuth.ts
// Shared request authentication helpers for API routes.

import { NextRequest } from 'next/server';
import { verifyToken, type JWTPayload, type UserRole } from '@/lib/auth';

/**
 * Extract and verify the authenticated user from the auth-token cookie.
 */
export function getAuthUser(request: NextRequest): JWTPayload | null {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Check whether the user has one of the allowed roles.
 */
export function hasRole(user: JWTPayload | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Roles allowed to access Environmental module pages.
 */
export const ENV_READ_ROLES: UserRole[] = ['admin', 'ceo', 'departmental_head'];
export const ENV_PRODUCT_ROLES: UserRole[] = ['admin', 'ceo'];
export const ENV_WRITE_ROLES: UserRole[] = ['admin', 'ceo', 'departmental_head'];
export const ENV_ADMIN_WRITE_ROLES: UserRole[] = ['admin', 'ceo'];

/**
 * Roles allowed to access Social module pages.
 */
export const SOCIAL_READ_ROLES: UserRole[] = ['admin', 'ceo', 'departmental_head', 'employee'];
export const SOCIAL_MANAGE_ROLES: UserRole[] = ['admin', 'ceo', 'departmental_head'];
export const SOCIAL_APPROVE_ROLES: UserRole[] = ['admin', 'ceo', 'departmental_head'];
export const SOCIAL_DIVERSITY_ROLES: UserRole[] = ['admin', 'ceo'];
