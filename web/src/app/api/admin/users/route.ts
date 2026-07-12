// src/app/api/admin/users/route.ts
// API route for Admin User Management
// GET /api/admin/users - Get all users
// PUT /api/admin/users - Update a user's details

import { NextRequest } from 'next/server';
import { getAllUsers, updateUserAdmin } from '@/services/userService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken, type UserRole } from '@/lib/auth';
import logger from '@/lib/logger';

// Helper to check if request is authorized as admin
function isAdmin(request: NextRequest): boolean {
  // Read token from HTTP-only cookie
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;

  const payload = verifyToken(token);
  // Admin and CEO share full platform privileges
  return payload?.role === 'admin' || payload?.role === 'ceo';
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return errorResponse('Access denied. Admin role required.', 403, 'UNAUTHORIZED');
    }

    const users = await getAllUsers();
    return successResponse(users, 'Users retrieved successfully');
  } catch (err) {
    logger.error('GET /api/admin/users error', { error: (err as Error).message });
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

    const { userId, role, departmentId, status } = body as Record<string, unknown>;

    if (typeof userId !== 'number') {
      return errorResponse('Valid userId (number) is required', 400, 'VALIDATION_ERROR');
    }

    // Prepare update parameters
    const updateData: {
      role?: UserRole;
      department_id?: number | null;
      status?: 'active' | 'inactive' | 'draft' | 'archived';
    } = {};

    if (role !== undefined) {
      if (!['admin', 'ceo', 'departmental_head', 'employee'].includes(role as string)) {
        return errorResponse('Invalid role specified', 400, 'VALIDATION_ERROR');
      }
      updateData.role = role as UserRole;
    }

    if (departmentId !== undefined) {
      if (departmentId === null) {
        updateData.department_id = null;
      } else if (typeof departmentId === 'number') {
        updateData.department_id = departmentId;
      } else {
        return errorResponse('Invalid departmentId specified', 400, 'VALIDATION_ERROR');
      }
    }

    if (status !== undefined) {
      if (!['active', 'inactive', 'draft', 'archived'].includes(status as string)) {
        return errorResponse('Invalid status specified', 400, 'VALIDATION_ERROR');
      }
      updateData.status = status as 'active' | 'inactive' | 'draft' | 'archived';
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No update parameters provided', 400, 'VALIDATION_ERROR');
    }

    const success = await updateUserAdmin(userId, updateData);

    if (!success) {
      return errorResponse('User not found or no changes made', 404, 'NOT_FOUND');
    }

    logger.info('Admin updated user details', { userId, updates: updateData });
    return successResponse(null, 'User updated successfully');
  } catch (err) {
    logger.error('PUT /api/admin/users error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
