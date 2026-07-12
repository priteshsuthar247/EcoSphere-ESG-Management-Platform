// src/app/api/auth/logout/route.ts
// POST /api/auth/logout
// Clears the auth cookie to log out the user.

import { NextRequest } from 'next/server';
import { successResponse } from '@/utils/apiResponse';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  logger.info('User logged out', { ip: request.headers.get('x-forwarded-for') });

  const response = successResponse(null, 'Logged out successfully');

  // Clear the auth cookie (must match path/sameSite used at login)
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return response;
}
