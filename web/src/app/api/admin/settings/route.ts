// src/app/api/admin/settings/route.ts
// GET /api/admin/settings - Retrieve system configuration settings
// POST /api/admin/settings - Save system configuration settings

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '@/lib/logger';

interface SystemSettingRow extends RowDataPacket {
  key: string;
  value: unknown;
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
    const keysParam = url.searchParams.get('keys');
    if (!keysParam) {
      return errorResponse('Missing keys parameter', 400, 'VALIDATION_ERROR');
    }

    const keys = keysParam.split(',');
    if (keys.length === 0) {
      return errorResponse('Invalid keys specified', 400, 'VALIDATION_ERROR');
    }

    // Placeholders for parameterized query
    const placeholders = keys.map(() => '?').join(',');
    const [rows] = await pool.execute<SystemSettingRow[]>(
      `SELECT \`key\`, value FROM system_settings WHERE \`key\` IN (${placeholders})`,
      keys
    );

    // Build configuration object
    const config: Record<string, unknown> = {};
    
    // Fill defaults first
    keys.forEach((key) => {
      if (key === 'esg_config') {
        config[key] = {
          enableEmissionCalculation: true,
          requireCsrEvidence: true,
          autoAwardBadges: true
        };
      } else if (key === 'notification_config') {
        config[key] = {
          emailAlertsCompliance: true,
          emailAlertsRedemption: true,
          emailAlertsChallenges: true
        };
      } else {
        config[key] = null;
      }
    });

    // Populate actual DB records
    rows.forEach((row) => {
      config[row.key] = row.value;
    });

    return successResponse(config, 'Configuration settings retrieved');
  } catch (err) {
    logger.error('GET /api/admin/settings error', { error: (err as Error).message });
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

    const token = request.cookies.get('auth-token')?.value;
    const payload = verifyToken(token!);
    const adminUserId = payload?.id || 1;

    const updates = body as Record<string, unknown>;

    for (const [key, value] of Object.entries(updates)) {
      // Validate key names to prevent cluttering the database
      if (!['esg_config', 'notification_config'].includes(key)) {
        return errorResponse(`Unauthorized settings key: ${key}`, 400, 'VALIDATION_ERROR');
      }

      // Convert value object to JSON string for the DB row
      const jsonValue = JSON.stringify(value);

      // Perform upsert (INSERT ... ON DUPLICATE KEY UPDATE)
      await pool.execute<ResultSetHeader>(
        `INSERT INTO system_settings (\`key\`, value, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE value = ?, updated_by = ?, updated_at = NOW()`,
        [key, jsonValue, adminUserId, jsonValue, adminUserId]
      );
    }

    logger.info('Admin updated system settings configurations', { keys: Object.keys(updates) });
    return successResponse(null, 'Configuration settings updated successfully');
  } catch (err) {
    logger.error('POST /api/admin/settings error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
