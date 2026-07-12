// GET /api/auth/me — current user from auth cookie (for client UI role gating)

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return errorResponse('Not authenticated', 401, 'UNAUTHORIZED');
  }

  const payload = verifyToken(token);
  if (!payload) {
    return errorResponse('Invalid session', 401, 'UNAUTHORIZED');
  }

  return successResponse(
    {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      department_id: payload.department_id,
    },
    'OK',
  );
}
