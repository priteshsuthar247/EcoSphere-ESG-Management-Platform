// src/app/api/gamification/participation/route.ts
// GET /api/gamification/participation - List participations
// PUT /api/gamification/participation - Approve or reject participation proof logs (Manager/Admin only)

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import { sendMail } from '@/lib/email';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '@/lib/logger';

interface ParticipationRow extends RowDataPacket {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  challenge_id: number;
  challenge_title: string;
  xp_reward: number;
  progress_percent: number;
  approval_status: string;
  xp_awarded: number;
  joined_at: string;
  completed_at: string | null;
}

interface BadgeCheckRow extends RowDataPacket {
  id: number;
  name: string;
  unlock_rule: {
    points_required?: number;
  };
}

interface UserPointsRow extends RowDataPacket {
  esg_points_balance: number;
  email: string;
  name: string;
}

// Check if user is manager or admin
function isElevatedUser(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  return payload?.role === 'admin' || payload?.role === 'departmental_head' || payload?.role === 'ceo';
}

/**
 * Evaluates points requirements and awards badges to a user.
 */
async function awardEligibleBadges(userId: number) {
  try {
    // 1. Fetch user current points
    const [userRows] = await pool.execute<UserPointsRow[]>(
      'SELECT name, email, esg_points_balance FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    const user = userRows[0];
    if (!user) return;

    // 2. Fetch all badges
    const [badges] = await pool.execute<BadgeCheckRow[]>(
      'SELECT id, name, unlock_rule FROM badges WHERE status = ?',
      ['active']
    );

    // 3. Fetch badges already awarded
    const [awardedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT badge_id FROM user_badges WHERE user_id = ?',
      [userId]
    );
    const awardedBadgeIds = new Set(awardedRows.map(row => row.badge_id));

    // 4. Evaluate each badge
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
            userId,
            badge.id,
            `Unlocked by achieving an ESG points balance of ${user.esg_points_balance} (Requirement: ${pointsRequired}).`
          ]
        );

        logger.info('User unlocked badge', { userId, badgeId: badge.id, badgeName: badge.name });

        // Add to notifications table
        await pool.execute(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES (?, 'badge_unlocked', ?, ?)`,
          [
            userId,
            'Badge Unlocked!',
            `Congratulations! You have unlocked the ${badge.name}.`
          ]
        );

        // Check if badge auto-award email is enabled in system settings
        const [settingsRows] = await pool.execute<RowDataPacket[]>(
          'SELECT value FROM system_settings WHERE `key` = ? LIMIT 1',
          ['notification_config']
        );
        const config = settingsRows[0]?.value;

        if (config?.emailAlertsChallenges !== false) {
          const htmlContent = `
            <div style="font-family: monospace; background-color: #0d0d0d; color: #00ff41; padding: 24px; border: 1px solid #444444;">
              <h2 style="color: #00ff41;">[ECOSPHERE ACHIEVEMENT SYSTEM]</h2>
              <p style="color: #8b8b8b;">// Badge Achievement Unlocked</p>
              <div style="border: 1px solid #00ff41; padding: 16px; margin: 16px 0; background: rgba(0,255,65,0.03);">
                ACHIEVEMENT: ${badge.name}<br>
                RECIPIENT: ${user.name}<br>
                POINTS HELD: ${user.esg_points_balance}
              </div>
              <p style="color: #f1f5f9;">You have reached the required points threshold and unlocked this achievement!</p>
              <div style="margin-top: 24px; border-top: 1px dashed #222222; padding-top: 16px; font-size: 11px; color: #555555;">
                EcoSphere Automated Achievment Relay
              </div>
            </div>
          `;

          sendMail({
            to: user.email,
            subject: `Achievement Unlocked: ${badge.name}!`,
            html: htmlContent
          }).catch(mailErr => {
            logger.error('Failed to send badge unlock email', { error: mailErr.message });
          });
        }
      }
    }
  } catch (err) {
    logger.error('awardEligibleBadges error', { error: (err as Error).message, userId });
  }
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

    let query = `
      SELECT 
        cp.id, 
        cp.user_id, 
        u.name AS user_name, 
        u.email AS user_email, 
        cp.challenge_id, 
        c.title AS challenge_title, 
        c.xp_reward, 
        cp.progress_percent, 
        cp.approval_status, 
        cp.xp_awarded, 
        cp.joined_at, 
        cp.completed_at
      FROM challenge_participations cp
      JOIN users u ON u.id = cp.user_id
      JOIN challenges c ON c.id = cp.challenge_id
    `;

    const values: any[] = [];

    // Employees can only view their own participations
    if (payload.role === 'employee') {
      query += ' WHERE cp.user_id = ?';
      values.push(payload.id);
    }

    query += ' ORDER BY cp.id DESC';

    const [rows] = await pool.execute<ParticipationRow[]>(query, values);
    return successResponse(rows, 'Participations list retrieved');
  } catch (err) {
    logger.error('GET /api/gamification/participation error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isElevatedUser(request)) {
      return errorResponse('Access denied. Head/CEO/Admin role required.', 403, 'UNAUTHORIZED');
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

    const { id, status } = body as Record<string, unknown>;

    if (typeof id !== 'number') {
      return errorResponse('Valid participation ID is required', 400, 'VALIDATION_ERROR');
    }

    if (typeof status !== 'string' || !['approved', 'rejected'].includes(status)) {
      return errorResponse('Valid status (approved/rejected) is required', 400, 'VALIDATION_ERROR');
    }

    // Get current participation record and associated challenge reward
    const [partRows] = await pool.execute<RowDataPacket[]>(`
      SELECT cp.user_id, cp.approval_status, c.xp_reward, u.email, u.name, c.title AS challenge_title
      FROM challenge_participations cp
      JOIN challenges c ON c.id = cp.challenge_id
      JOIN users u ON u.id = cp.user_id
      WHERE cp.id = ?
      LIMIT 1
    `, [id]);

    const part = partRows[0];
    if (!part) {
      return errorResponse('Participation log not found', 404, 'NOT_FOUND');
    }

    if (part.approval_status !== 'pending') {
      return errorResponse('This submission has already been reviewed', 400, 'ALREADY_REVIEWED');
    }

    const token = request.cookies.get('auth-token')?.value;
    const payload = verifyToken(token!);
    const reviewerUserId = payload?.id || 1;

    const finalStatus = status as 'approved' | 'rejected';
    const xpAwarded = finalStatus === 'approved' ? part.xp_reward : 0;

    // Update participation log
    await pool.execute(
      `UPDATE challenge_participations 
       SET approval_status = ?, xp_awarded = ?, approved_by = ?, completed_at = IF(?, NOW(), NULL)
       WHERE id = ?`,
      [finalStatus, xpAwarded, reviewerUserId, finalStatus === 'approved', id]
    );

    // If approved, increment employee XP and Points balance
    if (finalStatus === 'approved') {
      await pool.execute(
        `UPDATE users 
         SET total_xp = total_xp + ?, esg_points_balance = esg_points_balance + ?
         WHERE id = ?`,
        [xpAwarded, xpAwarded, part.user_id]
      );

      logger.info('Approved challenge participation, points awarded', { userId: part.user_id, xpAwarded });

      // Run automatic badges assessment
      await awardEligibleBadges(part.user_id);
    }

    // Add to notifications
    await pool.execute(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES (?, 'challenge_approval_decision', ?, ?)`,
      [
        part.user_id,
        `Challenge ${finalStatus === 'approved' ? 'Approved' : 'Rejected'}`,
        `Your completion proof for "${part.challenge_title}" has been ${finalStatus}.`
      ]
    );

    // Check if notification email alerts are enabled
    const [settingsRows] = await pool.execute<RowDataPacket[]>(
      'SELECT value FROM system_settings WHERE `key` = ? LIMIT 1',
      ['notification_config']
    );
    const config = settingsRows[0]?.value;

    if (config?.emailAlertsChallenges !== false) {
      const htmlContent = `
        <div style="font-family: monospace; background-color: #0d0d0d; color: #00ff41; padding: 24px; border: 1px solid #444444;">
          <h2 style="color: #00ff41;">[ECOSPHERE GAMIFICATION SUB-PORTAL]</h2>
          <p style="color: #8b8b8b;">// Challenge review decision logged</p>
          <div style="border: 1px solid #00ff41; padding: 16px; margin: 16px 0; background: rgba(0,255,65,0.03);">
            CHALLENGE: ${part.challenge_title}<br>
            PARTICIPANT: ${part.name}<br>
            DECISION: ${finalStatus.toUpperCase()}<br>
            XP/POINTS EARNED: ${xpAwarded}
          </div>
          <p style="color: #f1f5f9;">Your verification has been reviewed. Access your profile page to see updated XP records.</p>
          <div style="margin-top: 24px; border-top: 1px dashed #222222; padding-top: 16px; font-size: 11px; color: #555555;">
            EcoSphere Automated Identity Subsystem
          </div>
        </div>
      `;

      sendMail({
        to: part.email,
        subject: `Challenge Submission Reviewed: ${finalStatus.toUpperCase()}`,
        html: htmlContent
      }).catch(mailErr => {
        logger.error('Failed to send challenge approval notification email', { error: mailErr.message });
      });
    }

    return successResponse(null, `Submission successfully ${finalStatus}.`);
  } catch (err) {
    logger.error('PUT /api/gamification/participation error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
