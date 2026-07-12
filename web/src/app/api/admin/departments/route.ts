// src/app/api/admin/departments/route.ts
// GET /api/admin/departments - Get all departments for assignment dropdowns

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';

interface DepartmentDropdownEntry extends RowDataPacket {
  id: number;
  name: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return errorResponse('Access denied. Authorization required.', 401, 'UNAUTHORIZED');
    }

    const payload = verifyToken(token);
    if (!payload || !['admin', 'ceo', 'departmental_head'].includes(payload.role)) {
      return errorResponse('Access denied. Insufficient privileges.', 403, 'FORBIDDEN');
    }

    const [rows] = await pool.execute<DepartmentDropdownEntry[]>(
      'SELECT id, name FROM departments WHERE status = ? ORDER BY name ASC',
      ['active']
    );

    return successResponse(rows, 'Departments retrieved successfully');
  } catch (err) {
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
