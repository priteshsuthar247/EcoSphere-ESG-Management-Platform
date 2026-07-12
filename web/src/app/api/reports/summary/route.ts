// src/app/api/reports/summary/route.ts
// GET /api/reports/summary - Retrieve ESG Summary Report statistics (Admin/CEO only)

import { NextRequest } from 'next/server';
import { getESGSummaryStats } from '@/services/reportService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import logger from '@/lib/logger';

function isPrivilegedUser(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  return payload?.role === 'admin' || payload?.role === 'ceo';
}

export async function GET(request: NextRequest) {
  try {
    if (!isPrivilegedUser(request)) {
      return errorResponse('Access denied. Admin or CEO privileges required.', 403, 'UNAUTHORIZED');
    }

    const stats = await getESGSummaryStats();
    return successResponse(stats, 'ESG Summary statistics loaded successfully.');
  } catch (err) {
    logger.error('GET /api/reports/summary error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
