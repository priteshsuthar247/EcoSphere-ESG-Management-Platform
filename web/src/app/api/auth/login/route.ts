// src/app/api/auth/login/route.ts
// POST /api/auth/login
// Authenticates a user and sets an httpOnly JWT cookie.

import { NextRequest } from 'next/server';
import { findUserByEmail, verifyPassword, updateLastLogin } from '@/services/userService';
import { signToken, getDashboardPath } from '@/lib/auth';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import logger from '@/lib/logger';

// Input validation
function validateLoginInput(body: unknown): { email: string; password: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== 'string' || !email.includes('@')) return null;
  if (typeof password !== 'string' || password.length < 6) return null;
  return { email: email.trim().toLowerCase(), password };
}

export async function POST(request: NextRequest) {
  try {
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

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      name: user.name,
    });

    // Update last login (non-blocking)
    updateLastLogin(user.id).catch(() => {});

    const dashboardPath = getDashboardPath(user.role);

    logger.info('User logged in', { userId: user.id, role: user.role });

    const response = successResponse(
      { redirectTo: dashboardPath, role: user.role, name: user.name },
      'Login successful',
    );

    // Set secure httpOnly cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 30, // 30 minutes
      path: '/',
    });

    return response;
  } catch (err) {
    logger.error('Login route error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
