// src/app/api/auth/login/route.ts
// POST /api/auth/login
// Authenticates a user and sets an httpOnly JWT cookie.

import { NextRequest } from 'next/server';
import { findUserByEmail, verifyPassword, updateLastLogin } from '@/services/userService';
import { signToken, getDashboardPath } from '@/lib/auth';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import logger from '@/lib/logger';
import { rateLimit, clientIp } from '@/lib/rateLimit';

// Input validation
function validateLoginInput(body: unknown): { email: string; password: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== 'string' || !email.includes('@') || email.length > 255) return null;
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) return null;
  return { email: email.trim().toLowerCase(), password };
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rl = rateLimit(`login:${ip}`, 20, 15 * 60 * 1000); // 20 / 15 min
    if (!rl.allowed) {
      logger.warn('Login rate limited', { ip });
      return errorResponse('Too many login attempts. Try again later.', 429, 'RATE_LIMITED');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const input = validateLoginInput(body);
    if (!input) {
      return errorResponse('Invalid email or password format', 400, 'VALIDATION_ERROR');
    }

    const user = await findUserByEmail(input.email);

    // Use constant-time comparison to prevent user enumeration timing attacks
    const dummyHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsntZ2Gy9vMD6YXRL8eY7cKQWQRa';
    const passwordHash = user?.password_hash ?? dummyHash;
    const isValid = await verifyPassword(input.password, passwordHash);

    if (!user || !isValid) {
      logger.warn('Failed login attempt', { email: input.email, ip: request.headers.get('x-forwarded-for') });
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Normalize role so redirect never falls through incorrectly
    const role = user.role as 'admin' | 'ceo' | 'departmental_head' | 'employee';
    const validRoles = ['admin', 'ceo', 'departmental_head', 'employee'] as const;
    const safeRole = validRoles.includes(role) ? role : 'employee';

    const token = signToken({
      id: user.id,
      email: user.email,
      role: safeRole,
      department_id: user.department_id,
      name: user.name,
    });

    // Update last login (non-blocking)
    updateLastLogin(user.id).catch(() => {});

    // Always derive home from role — never trust a client-supplied path
    const dashboardPath = getDashboardPath(safeRole);

    logger.info('User logged in', { userId: user.id, role: safeRole, redirectTo: dashboardPath });

    const response = successResponse(
      { redirectTo: dashboardPath, role: safeRole, name: user.name },
      'Login successful',
    );

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // lax: reliable on same-site navigations after login (strict can drop cookies in edge cases)
      sameSite: 'lax' as const,
      path: '/',
    };

    // Clear any previous session cookie first, then set the new JWT
    response.cookies.set('auth-token', '', { ...cookieOpts, maxAge: 0 });
    response.cookies.set('auth-token', token, {
      ...cookieOpts,
      maxAge: 60 * 30, // 30 minutes
    });

    // Prevent caches from replaying a prior user's login response
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;
  } catch (err) {
    logger.error('Login route error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
