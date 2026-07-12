// src/app/api/auth/reset-password/route.ts
// GET /api/auth/reset-password - Validate password reset token
// POST /api/auth/reset-password - Reset password using token

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import bcrypt from 'bcryptjs';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import logger from '@/lib/logger';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

interface ResetTokenRow extends RowDataPacket {
  user_id: number;
  expires_at: Date;
}

const BCRYPT_ROUNDS = 12;

// Check token validation in database
async function getValidTokenRow(token: string): Promise<ResetTokenRow | null> {
  const [rows] = await pool.execute<ResetTokenRow[]>(
    'SELECT user_id, expires_at FROM password_resets WHERE token = ? LIMIT 1',
    [token]
  );
  
  const row = rows[0];
  if (!row) return null;

  // Check expiration
  if (new Date(row.expires_at) < new Date()) {
    // Clean up expired token
    pool.execute('DELETE FROM password_resets WHERE token = ?', [token]).catch(() => {});
    return null;
  }

  return row;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return errorResponse('Reset token is required', 400, 'VALIDATION_ERROR');
    }

    const tokenRow = await getValidTokenRow(token);
    if (!tokenRow) {
      return errorResponse('Token is invalid or has expired', 400, 'INVALID_TOKEN');
    }

    return successResponse(null, 'Token is valid');
  } catch (err) {
    logger.error('GET /api/auth/reset-password error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid payload', 400);
    }

    const { token, password } = body as Record<string, unknown>;

    if (typeof token !== 'string' || !token) {
      return errorResponse('Reset token is required', 400, 'VALIDATION_ERROR');
    }

    if (typeof password !== 'string' || password.length < 8) {
      return errorResponse('Password must be at least 8 characters long', 400, 'VALIDATION_ERROR');
    }

    // Password strength check
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return errorResponse('Password must contain uppercase, lowercase, and a number', 400, 'VALIDATION_ERROR');
    }

    const tokenRow = await getValidTokenRow(token);
    if (!tokenRow) {
      return errorResponse('Token is invalid or has expired', 400, 'INVALID_TOKEN');
    }

    // Hash password
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Update user password
    const [userUpdate] = await pool.execute<ResultSetHeader>(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashed, tokenRow.user_id]
    );

    if (userUpdate.affectedRows === 0) {
      return errorResponse('User account not found', 404, 'NOT_FOUND');
    }

    // Delete token to prevent reuse
    await pool.execute('DELETE FROM password_resets WHERE token = ?', [token]);

    logger.info('Password reset successfully completed', { userId: tokenRow.user_id });
    return successResponse(null, 'Password has been reset successfully.');
  } catch (err) {
    logger.error('POST /api/auth/reset-password error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
