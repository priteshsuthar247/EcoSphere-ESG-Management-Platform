// src/app/api/gamification/badges/route.ts
// GET /api/gamification/badges - Retrieve all badges and awarded logs
// POST /api/gamification/badges - Trigger re-evaluation of point-based badges for all users (Admin only)

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '@/lib/logger';

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
    if (!payload) {
      return errorResponse('Access denied. Invalid token.', 401, 'UNAUTHORIZED');
    }

    // 1. Fetch all badges
    const [badges] = await pool.execute<BadgeEntry[]>(
      'SELECT id, name, description, icon_url, unlock_rule, status FROM badges ORDER BY id ASC'
    );

    // 2. Fetch all awarded badge logs
    const [awarded] = await pool.execute<AwardedBadgeRow[]>(`
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
      ORDER BY ub.id DESC
    `);

    return successResponse({ badges, awarded }, 'Badges data retrieved successfully');
  } catch (err) {
    logger.error('GET /api/gamification/badges error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return errorResponse('Access denied. Admin role required.', 403, 'UNAUTHORIZED');
    }

    // Manual evaluation for all active users
    const [users] = await pool.execute<RowDataPacket[]>(
      'SELECT id, name, email, esg_points_balance FROM users WHERE status = ?',
      ['active']
    );

    const [badges] = await pool.execute<BadgeEntry[]>(
      'SELECT id, name, unlock_rule FROM badges WHERE status = ?',
      ['active']
    );

    let countAwarded = 0;

    for (const user of users) {
      const [awardedRows] = await pool.execute<RowDataPacket[]>(
        'SELECT badge_id FROM user_badges WHERE user_id = ?',
        [user.id]
      );
      const awardedBadgeIds = new Set(awardedRows.map(row => row.badge_id));

      for (const badge of badges) {
        if (awardedBadgeIds.has(badge.id)) continue;

        const rule = badge.unlock_rule;
        const pointsRequired = rule?.points_required;

        if (typeof pointsRequired === 'number' && user.esg_points_balance >= pointsRequired) {
          // Award badge
          await pool.execute(
            `INSERT IGNORE INTO user_badges (user_id, badge_id, awarded_reason)
             VALUES (?, ?, ?)`,
            [
              user.id,
              badge.id,
              `Unlocked during system-wide re-evaluation. User has points balance of ${user.esg_points_balance} (Requirement: ${pointsRequired}).`
            ]
          );

          // Add in-app notification
          await pool.execute(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES (?, 'badge_unlocked', ?, ?)`,
            [
              user.id,
              'Badge Unlocked!',
              `Congratulations! You have unlocked the ${badge.name}.`
            ]
          );

          countAwarded++;
        }
      }
    }

    logger.info('Completed manual badges re-evaluation', { awardedCount: countAwarded });
    return successResponse({ awardedCount: countAwarded }, 'System-wide badge re-evaluation completed successfully.');
  } catch (err) {
    logger.error('POST /api/gamification/badges error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
