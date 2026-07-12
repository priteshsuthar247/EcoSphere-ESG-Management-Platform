// src/lib/auth.ts
// JWT sign and verify helpers using jsonwebtoken (server-side)
// and jose (Edge-compatible, used in middleware).

import jwt, { type SignOptions } from 'jsonwebtoken';
import logger from '@/lib/logger';

export type UserRole = 'admin' | 'ceo' | 'departmental_head' | 'employee';

export interface JWTPayload {
  id: number;
  email: string;
  role: UserRole;
  department_id: number | null;
  name: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m';

if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not set. Application cannot start securely.');
  throw new Error('JWT_SECRET environment variable must be set.');
}

/**
 * Sign a JWT token with the given payload.
 * Used in API routes (Node.js runtime).
 */
export function signToken(payload: JWTPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload as object, JWT_SECRET, options);
}

/**
 * Verify a JWT token and return the payload.
 * Used in API routes (Node.js runtime).
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (err) {
    logger.warn('JWT verification failed', { error: (err as Error).message });
    return null;
  }
}

/**
 * Get the dashboard redirect path based on user role.
 */
export function getDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    admin: '/dashboard/admin',
    ceo: '/dashboard/ceo',
    departmental_head: '/dashboard/departmental-head',
    employee: '/dashboard/employee',
  };
  return paths[role] ?? '/dashboard/employee';
}
