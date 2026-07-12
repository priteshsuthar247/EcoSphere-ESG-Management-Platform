// GET /api/auth/me — current user from auth cookie (for client UI role gating)

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { findUserById } from '@/services/userService';
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

  // Refresh points balance from DB (JWT does not carry live balances)
  const dbUser = await findUserById(payload.id);

  return successResponse(
    {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      department_id: payload.department_id,
      esg_points_balance: dbUser?.esg_points_balance ?? 0,
      total_xp: dbUser?.total_xp ?? 0,
    },
    'OK',
  );
}
