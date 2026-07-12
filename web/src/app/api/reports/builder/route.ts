// src/app/api/reports/builder/route.ts
// POST /api/reports/builder - Generate dynamic ESG Custom report builder tabular rows (Admin/CEO only)

import { NextRequest } from 'next/server';
import { buildCustomReport } from '@/services/reportService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import logger from '@/lib/logger';

function isPrivilegedUser(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  return payload?.role === 'admin' || payload?.role === 'ceo';
}

export async function POST(request: NextRequest) {
  try {
    if (!isPrivilegedUser(request)) {
      return errorResponse('Access denied. Admin or CEO privileges required.', 403, 'UNAUTHORIZED');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid payload', 400);
    }

    const { module, departmentId, startDate, endDate, employeeId } = body as Record<string, unknown>;

    // Prepare structured filters
    const filters: {
      module?: 'environmental' | 'social' | 'governance' | 'all';
      departmentId?: number | null;
      startDate?: string | null;
      endDate?: string | null;
      employeeId?: number | null;
    } = {};

    if (module && ['environmental', 'social', 'governance', 'all'].includes(module as string)) {
      filters.module = module as 'environmental' | 'social' | 'governance' | 'all';
    }
    if (typeof departmentId === 'number') {
      filters.departmentId = departmentId;
    }
    if (typeof startDate === 'string' && startDate) {
      filters.startDate = startDate;
    }
    if (typeof endDate === 'string' && endDate) {
      filters.endDate = endDate;
    }
    if (typeof employeeId === 'number') {
      filters.employeeId = employeeId;
    }

    const rows = await buildCustomReport(filters);
    return successResponse(rows, 'Custom report builder rows loaded.');
  } catch (err) {
    logger.error('POST /api/reports/builder error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
