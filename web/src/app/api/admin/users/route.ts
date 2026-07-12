// src/app/api/admin/users/route.ts
// API route for Admin User Management
// GET /api/admin/users - Get all users
// PUT /api/admin/users - Update a user's details

import { NextRequest } from 'next/server';
import { getAllUsers, updateUserAdmin } from '@/services/userService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken, type UserRole } from '@/lib/auth';
import logger from '@/lib/logger';

function getCaller(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Admin and CEO may manage users (CEO cannot see/edit admin accounts)
function isPrivileged(request: NextRequest): boolean {
  const payload = getCaller(request);
  return payload?.role === 'admin' || payload?.role === 'ceo';
}

export async function GET(request: NextRequest) {
  try {
    const caller = getCaller(request);
    if (!caller || (caller.role !== 'admin' && caller.role !== 'ceo')) {
      return errorResponse('Access denied. Admin or CEO role required.', 403, 'UNAUTHORIZED');
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const status = searchParams.get('status') || 'all';
    const role = searchParams.get('role') || 'all';

    // CEO must not see admin accounts in the user list
    const users = await getAllUsers({
      excludeAdminRoles: caller.role === 'ceo',
      search: search || undefined,
      status,
      role,
    });
    return successResponse(users, 'Users retrieved successfully');
  } catch (err) {
    logger.error('GET /api/admin/users error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const caller = getCaller(request);
    if (!caller || !isPrivileged(request)) {
      return errorResponse('Access denied. Admin or CEO role required.', 403, 'UNAUTHORIZED');
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

    const { userId: rawUserId, role, departmentId, status } = body as Record<string, unknown>;
    const userId = typeof rawUserId === 'number' ? rawUserId : Number(rawUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return errorResponse('Valid userId (number) is required', 400, 'VALIDATION_ERROR');
    }

    // CEO cannot promote anyone to admin, or edit admin users
    if (caller.role === 'ceo') {
      if (role === 'admin') {
        return errorResponse('CEO cannot assign the admin role.', 403, 'FORBIDDEN');
      }
      const all = await getAllUsers();
      const target = all.find((u) => u.id === userId);
      if (target?.role === 'admin') {
        return errorResponse('CEO cannot modify admin accounts.', 403, 'FORBIDDEN');
      }
    }

    // Block admins from locking themselves out of the last admin seat
    if (
      caller.role === 'admin' &&
      caller.id === userId &&
      ((typeof role === 'string' && role !== 'admin') ||
        (typeof status === 'string' && status !== 'active'))
    ) {
      // Still allow if other active admins exist — enforced in updateUserAdmin
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

    logger.info('Admin updated user details', { userId, updates: updateData, by: caller.id });
    return successResponse(null, 'User updated successfully');
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'LAST_ADMIN_PROTECTED') {
      return errorResponse(
        'Cannot demote or deactivate the last active admin account.',
        403,
        'LAST_ADMIN_PROTECTED',
      );
    }
    logger.error('PUT /api/admin/users error', { error: message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
