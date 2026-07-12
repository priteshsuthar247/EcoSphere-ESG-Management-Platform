// src/app/api/auth/signup/route.ts
// POST /api/auth/signup
// Creates a new employee account and sets an httpOnly JWT cookie.

import { NextRequest } from 'next/server';
import { createUser } from '@/services/userService';
import { signToken, getDashboardPath } from '@/lib/auth';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import logger from '@/lib/logger';
import { rateLimit, clientIp } from '@/lib/rateLimit';

// Input validation
function validateSignupInput(body: unknown): { name: string; email: string; password: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { name, email, password } = body as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 150) return null;
  if (typeof email !== 'string' || !email.includes('@') || email.length > 255) return null;
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return null;
  // Password strength: at least 1 uppercase, 1 lowercase, 1 digit
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) return null;
  return { name: name.trim(), email: email.trim().toLowerCase(), password };
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rl = rateLimit(`signup:${ip}`, 10, 60 * 60 * 1000); // 10 / hour
    if (!rl.allowed) {
      return errorResponse('Too many signup attempts. Try again later.', 429, 'RATE_LIMITED');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const input = validateSignupInput(body);
    if (!input) {
      return errorResponse(
        'Invalid input. Password must be at least 8 characters with uppercase, lowercase, and a number.',
        400,
        'VALIDATION_ERROR',
      );
    }

    const user = await createUser(input);

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      name: user.name,
    });

    const dashboardPath = getDashboardPath(user.role);

    logger.info('New user signed up', { userId: user.id });

    const response = successResponse(
      { redirectTo: dashboardPath, role: user.role, name: user.name },
      'Account created successfully',
      201,
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 30, // 30 minutes
      path: '/',
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return response;
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'EMAIL_ALREADY_EXISTS') {
      return errorResponse('An account with this email already exists.', 409, 'EMAIL_EXISTS');
    }
    logger.error('Signup route error', { error: message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
