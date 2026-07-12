// src/app/api/admin/categories/route.ts
// GET /api/admin/categories - Get categories
// POST /api/admin/categories - Create a category
// PUT /api/admin/categories - Update a category

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '@/lib/logger';

interface CategoryEntry extends RowDataPacket {
  id: number;
  name: string;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
}

// Helper to check if request is admin
function isAdmin(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  return payload?.role === 'admin';
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

    const [rows] = await pool.execute<CategoryEntry[]>(
      'SELECT id, name, type, description, status, created_at FROM categories ORDER BY id ASC'
    );

    return successResponse(rows, 'Categories retrieved successfully');
  } catch (err) {
    logger.error('GET /api/admin/categories error', { error: (err as Error).message });
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

    const { name, type, description, status } = body as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('Valid name is required (min 2 chars)', 400, 'VALIDATION_ERROR');
    }

    if (!['csr_activity', 'challenge', 'esg_category'].includes(type as string)) {
      return errorResponse('Valid type is required (csr_activity, challenge, esg_category)', 400, 'VALIDATION_ERROR');
    }

    const finalStatus = typeof status === 'string' && ['active', 'inactive', 'draft', 'archived'].includes(status) ? status : 'active';

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO categories (name, type, description, status)
       VALUES (?, ?, ?, ?)`,
      [
        (name as string).trim(),
        type as string,
        typeof description === 'string' ? description.trim() : null,
        finalStatus
      ]
    );

    logger.info('Created category', { categoryId: result.insertId, name });
    return successResponse({ id: result.insertId }, 'Category created successfully', 201);
  } catch (err) {
    logger.error('POST /api/admin/categories error', { error: (err as Error).message });
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

    const { id, name, type, description, status } = body as Record<string, unknown>;

    if (typeof id !== 'number') {
      return errorResponse('Valid category ID is required', 400, 'VALIDATION_ERROR');
    }
    if (typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('Valid name is required', 400, 'VALIDATION_ERROR');
    }
    if (!['csr_activity', 'challenge', 'esg_category'].includes(type as string)) {
      return errorResponse('Valid type is required', 400, 'VALIDATION_ERROR');
    }

    const finalStatus = typeof status === 'string' && ['active', 'inactive', 'draft', 'archived'].includes(status) ? status : 'active';

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categories 
       SET name = ?, type = ?, description = ?, status = ?
       WHERE id = ?`,
      [
        (name as string).trim(),
        type as string,
        typeof description === 'string' ? description.trim() : null,
        finalStatus,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Category not found', 404, 'NOT_FOUND');
    }

    logger.info('Updated category details', { categoryId: id, name });
    return successResponse(null, 'Category updated successfully');
  } catch (err) {
    logger.error('PUT /api/admin/categories error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
