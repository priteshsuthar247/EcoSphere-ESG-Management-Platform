// src/app/api/admin/departments/route.ts
// GET /api/admin/departments - Get departments
// POST /api/admin/departments - Create a department
// PUT /api/admin/departments - Update a department

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '@/lib/logger';

interface DepartmentDetailEntry extends RowDataPacket {
  id: number;
  name: string;
  code: string;
  head_user_id: number | null;
  head_user_name: string | null;
  parent_department_id: number | null;
  parent_department_name: string | null;
  employee_count: number;
  description: string | null;
  location: string | null;
  status: string;
}

// Helper to check if request is admin
function isAdmin(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  // Admin and CEO share full platform privileges
  return payload?.role === 'admin' || payload?.role === 'ceo';
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

    const url = new URL(request.url);
    const dropdown = url.searchParams.get('dropdown') === 'true';

    if (dropdown) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, name FROM departments WHERE status = ? ORDER BY name ASC',
        ['active']
      );
      return successResponse(rows, 'Departments retrieved successfully');
    }

    // Detailed view with joins
    const [rows] = await pool.execute<DepartmentDetailEntry[]>(`
      SELECT 
        d.id, 
        d.name, 
        d.code, 
        d.head_user_id, 
        u.name AS head_user_name, 
        d.parent_department_id, 
        p.name AS parent_department_name, 
        d.employee_count, 
        d.description, 
        d.location, 
        d.status
      FROM departments d
      LEFT JOIN users u ON u.id = d.head_user_id
      LEFT JOIN departments p ON p.id = d.parent_department_id
      ORDER BY d.id ASC
    `);

    return successResponse(rows, 'Detailed departments retrieved successfully');
  } catch (err) {
    logger.error('GET /api/admin/departments error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return errorResponse('Access denied. Admin role required.', 403, 'UNAUTHORIZED');
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

    const { name, code, headUserId, parentDepartmentId, description, location, status } = body as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('Valid name is required (min 2 chars)', 400, 'VALIDATION_ERROR');
    }
    if (typeof code !== 'string' || code.trim().length < 2) {
      return errorResponse('Valid code is required (min 2 chars)', 400, 'VALIDATION_ERROR');
    }

    const finalHeadUserId = typeof headUserId === 'number' ? headUserId : null;
    const finalParentDeptId = typeof parentDepartmentId === 'number' ? parentDepartmentId : null;
    const finalStatus = typeof status === 'string' && ['active', 'inactive', 'draft', 'archived'].includes(status) ? status : 'active';

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO departments (name, code, head_user_id, parent_department_id, description, location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        code.trim().toUpperCase(),
        finalHeadUserId,
        finalParentDeptId,
        typeof description === 'string' ? description.trim() : null,
        typeof location === 'string' ? location.trim() : null,
        finalStatus
      ]
    );

    logger.info('Created department', { departmentId: result.insertId, code });
    return successResponse({ id: result.insertId }, 'Department created successfully', 201);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('Duplicate entry') || message.includes('code')) {
      return errorResponse('A department with this code already exists.', 409, 'DUPLICATE_CODE');
    }
    logger.error('POST /api/admin/departments error', { error: message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return errorResponse('Access denied. Admin role required.', 403, 'UNAUTHORIZED');
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

    const { id, name, code, headUserId, parentDepartmentId, description, location, status } = body as Record<string, unknown>;

    if (typeof id !== 'number') {
      return errorResponse('Valid department ID is required', 400, 'VALIDATION_ERROR');
    }
    if (typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('Valid name is required', 400, 'VALIDATION_ERROR');
    }
    if (typeof code !== 'string' || code.trim().length < 2) {
      return errorResponse('Valid code is required', 400, 'VALIDATION_ERROR');
    }

    const finalHeadUserId = typeof headUserId === 'number' ? headUserId : null;
    const finalParentDeptId = typeof parentDepartmentId === 'number' ? parentDepartmentId : null;
    const finalStatus = typeof status === 'string' && ['active', 'inactive', 'draft', 'archived'].includes(status) ? status : 'active';

    // Prevent circular parent dependency
    if (finalParentDeptId === id) {
      return errorResponse('A department cannot be its own parent', 400, 'VALIDATION_ERROR');
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE departments 
       SET name = ?, code = ?, head_user_id = ?, parent_department_id = ?, description = ?, location = ?, status = ?
       WHERE id = ?`,
      [
        name.trim(),
        code.trim().toUpperCase(),
        finalHeadUserId,
        finalParentDeptId,
        typeof description === 'string' ? description.trim() : null,
        typeof location === 'string' ? location.trim() : null,
        finalStatus,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Department not found', 404, 'NOT_FOUND');
    }

    // Non-blocking sync of employee counts (re-calculate from users table)
    pool.execute(`
      UPDATE departments d
      SET d.employee_count = (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.status = 'active')
    `).catch(() => {});

    logger.info('Updated department details', { departmentId: id, code });
    return successResponse(null, 'Department updated successfully');
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('Duplicate entry') || message.includes('code')) {
      return errorResponse('Another department with this code already exists.', 409, 'DUPLICATE_CODE');
    }
    logger.error('PUT /api/admin/departments error', { error: message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
