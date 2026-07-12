// src/app/api/gamification/badges/route.ts
// GET  /api/gamification/badges - Retrieve all badges and awarded logs
// POST /api/gamification/badges - Re-evaluate point-based badges for all users (Admin/CEO)

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';
import logger from '@/lib/logger';
import { reevaluateAllBadges } from '@/services/badgeService';

interface BadgeEntry extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  icon_url: string | null;
  unlock_rule: {
    points_required?: number;
  };
  status: string;
}

interface AwardedBadgeRow extends RowDataPacket {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  badge_id: number;
  badge_name: string;
  awarded_at: string;
  awarded_reason: string | null;
}

function isFullAccess(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  return payload?.role === 'admin' || payload?.role === 'ceo';
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return errorResponse('Access denied. Authorization required.', 401, 'UNAUTHORIZED');
    }

    const payload = verifyToken(token);
    if (!payload) {
      return errorResponse('Access denied. Invalid token.', 401, 'UNAUTHORIZED');
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();

    // Lowest tier first (Bronze → Diamond by points)
    const badgeClauses: string[] = [];
    const badgeParams: Array<string | number> = [];
    if (search) {
      const q = `%${search.replace(/[%_]/g, '\\$&')}%`;
      badgeClauses.push(
        '(name LIKE ? OR description LIKE ? OR CAST(id AS CHAR) LIKE ?)',
      );
      badgeParams.push(q, q, q);
    }
    const badgeWhere = badgeClauses.length ? `WHERE ${badgeClauses.join(' AND ')}` : '';
    const [badges] = await pool.execute<BadgeEntry[]>(
      `SELECT id, name, description, icon_url, unlock_rule, status
       FROM badges
       ${badgeWhere}
       ORDER BY
         CAST(JSON_UNQUOTE(JSON_EXTRACT(unlock_rule, '$.points_required')) AS UNSIGNED) ASC,
         id ASC`,
      badgeParams,
    );

    const awardClauses: string[] = [];
    const awardParams: Array<string | number> = [];
    if (search) {
      const q = `%${search.replace(/[%_]/g, '\\$&')}%`;
      awardClauses.push(
        '(u.name LIKE ? OR u.email LIKE ? OR b.name LIKE ? OR ub.awarded_reason LIKE ? OR CAST(ub.id AS CHAR) LIKE ?)',
      );
      awardParams.push(q, q, q, q, q);
    }
    const awardWhere = awardClauses.length ? `WHERE ${awardClauses.join(' AND ')}` : '';
    const [awarded] = await pool.execute<AwardedBadgeRow[]>(
      `
      SELECT 
        ub.id, 
        ub.user_id, 
        u.name AS user_name, 
        u.email AS user_email, 
        ub.badge_id, 
        b.name AS badge_name, 
        ub.awarded_at, 
        ub.awarded_reason
      FROM user_badges ub
      JOIN users u ON u.id = ub.user_id
      JOIN badges b ON b.id = ub.badge_id
      ${awardWhere}
      ORDER BY ub.id DESC
    `,
      awardParams,
    );

    return successResponse({ badges, awarded }, 'Badges data retrieved successfully');
  } catch (err) {
    logger.error('GET /api/gamification/badges error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isFullAccess(request)) {
      return errorResponse('Access denied. Admin or CEO role required.', 403, 'UNAUTHORIZED');
    }

    const countAwarded = await reevaluateAllBadges();

    return successResponse(
      { awardedCount: countAwarded },
      'System-wide badge re-evaluation completed successfully.',
    );
  } catch (err) {
    logger.error('POST /api/gamification/badges error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
