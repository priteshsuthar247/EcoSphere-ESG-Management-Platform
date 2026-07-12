// src/app/api/gamification/rewards/route.ts
// GET /api/gamification/rewards - Retrieve rewards catalog and redemption requests
// POST /api/gamification/rewards - Create a new reward (Admin only)
// PUT /api/gamification/rewards - Fulfill or cancel a reward redemption (Admin only)

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import { sendMail } from '@/lib/email';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '@/lib/logger';

interface RewardRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  points_required: number;
  stock_quantity: number;
  category: string | null;
  status: string;
}

interface RedemptionRequestRow extends RowDataPacket {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  reward_id: number;
  reward_name: string;
  points_required: number;
  redeemed_at: string;
  points_deducted: number;
  status: string;
  fulfilled_by: number | null;
  fulfilled_at: string | null;
  notes: string | null;
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

    // 1. Fetch catalog rewards
    const [rewards] = await pool.execute<RewardRow[]>(
      'SELECT id, name, description, points_required, stock_quantity, category, status FROM rewards ORDER BY id ASC'
    );

    // 2. Fetch redemption requests
    let query = `
      SELECT 
        rr.id, 
        rr.user_id, 
        u.name AS user_name, 
        u.email AS user_email, 
        rr.reward_id, 
        rw.name AS reward_name, 
        rw.points_required, 
        rr.redeemed_at, 
        rr.points_deducted, 
        rr.status, 
        rr.fulfilled_by, 
        rr.fulfilled_at, 
        rr.notes
      FROM reward_redemptions rr
      JOIN users u ON u.id = rr.user_id
      JOIN rewards rw ON rw.id = rr.reward_id
    `;

    const values: (string | number | boolean | null)[] = [];

    // Employees can only view their own redemptions
    if (payload.role === 'employee') {
      query += ' WHERE rr.user_id = ?';
      values.push(payload.id);
    }

    query += ' ORDER BY rr.id DESC';

    const [redemptions] = await pool.execute<RedemptionRequestRow[]>(query, values);

    return successResponse({ rewards, redemptions }, 'Rewards data loaded');
  } catch (err) {
    logger.error('GET /api/gamification/rewards error', { error: (err as Error).message });
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

    const { name, description, pointsRequired, stockQuantity, category, status } = body as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('Valid name is required (min 2 chars)', 400, 'VALIDATION_ERROR');
    }
    if (typeof pointsRequired !== 'number' || pointsRequired < 0) {
      return errorResponse('Points required must be a positive number', 400, 'VALIDATION_ERROR');
    }

    const finalStockQuantity = typeof stockQuantity === 'number' ? stockQuantity : 0;
    const finalCategory = typeof category === 'string' ? category.trim() : 'gift';
    const finalStatus = typeof status === 'string' && ['active', 'inactive', 'draft', 'archived'].includes(status) ? status : 'active';

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO rewards (name, description, points_required, stock_quantity, category, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        typeof description === 'string' ? description.trim() : null,
        pointsRequired,
        finalStockQuantity,
        finalCategory,
        finalStatus
      ]
    );

    logger.info('Created reward in catalog', { rewardId: result.insertId, name });
    return successResponse({ id: result.insertId }, 'Reward created successfully', 201);
  } catch (err) {
    logger.error('POST /api/gamification/rewards error', { error: (err as Error).message });
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

    const { redemptionId, status, notes } = body as Record<string, unknown>;

    if (typeof redemptionId !== 'number') {
      return errorResponse('Valid redemption ID is required', 400, 'VALIDATION_ERROR');
    }
    if (typeof status !== 'string' || !['fulfilled', 'cancelled'].includes(status)) {
      return errorResponse('Valid status (fulfilled/cancelled) is required', 400, 'VALIDATION_ERROR');
    }

    // Get current redemption record
    const [redRows] = await pool.execute<RowDataPacket[]>(`
      SELECT rr.user_id, rr.reward_id, rr.points_deducted, rr.status, u.email, u.name, rw.name AS reward_name
      FROM reward_redemptions rr
      JOIN users u ON u.id = rr.user_id
      JOIN rewards rw ON rw.id = rr.reward_id
      WHERE rr.id = ?
      LIMIT 1
    `, [redemptionId]);

    const redemption = redRows[0];
    if (!redemption) {
      return errorResponse('Redemption record not found', 404, 'NOT_FOUND');
    }

    if (redemption.status !== 'pending') {
      return errorResponse('This redemption request has already been processed', 400, 'ALREADY_PROCESSED');
    }

    const token = request.cookies.get('auth-token')?.value;
    const payload = verifyToken(token!);
    const adminUserId = payload?.id || 1;

    const finalStatus = status as 'fulfilled' | 'cancelled';
    const finalNotes = typeof notes === 'string' ? notes.trim() : null;

    // Begin database transaction for integrity
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // 1. Update redemption record status
      await conn.execute(
        `UPDATE reward_redemptions 
         SET status = ?, fulfilled_by = ?, fulfilled_at = NOW(), notes = ?
         WHERE id = ?`,
        [finalStatus, adminUserId, finalNotes, redemptionId]
      );

      // 2. Perform conditional steps:
      if (finalStatus === 'fulfilled') {
        // FULFILLED: Decrement reward stock quantity if it has stock (greater than 0)
        await conn.execute(
          'UPDATE rewards SET stock_quantity = GREATEST(stock_quantity - 1, 0) WHERE id = ?',
          [redemption.reward_id]
        );
      } else if (finalStatus === 'cancelled') {
        // CANCELLED: Refund deducted points back to user balance
        await conn.execute(
          'UPDATE users SET esg_points_balance = esg_points_balance + ? WHERE id = ?',
          [redemption.points_deducted, redemption.user_id]
        );
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    // Add to notifications
    await pool.execute(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES (?, 'reward_redemption', ?, ?)`,
      [
        redemption.user_id,
        `Reward Redemption ${finalStatus === 'fulfilled' ? 'Fulfilled' : 'Cancelled'}`,
        `Your redemption request for "${redemption.reward_name}" has been ${finalStatus}.`
      ]
    );

    // Send email notification if enabled in system notification settings
    const [settingsRows] = await pool.execute<RowDataPacket[]>(
      'SELECT value FROM system_settings WHERE `key` = ? LIMIT 1',
      ['notification_config']
    );
    const config = settingsRows[0]?.value;

    if (config?.emailAlertsRedemption !== false) {
      const htmlContent = `
        <div style="font-family: monospace; background-color: #0d0d0d; color: #00ff41; padding: 24px; border: 1px solid #444444;">
          <h2 style="color: #00ff41;">[ECOSPHERE REWARDS CATALOG]</h2>
          <p style="color: #8b8b8b;">// Incentive redemption status change log</p>
          <div style="border: 1px solid #00ff41; padding: 16px; margin: 16px 0; background: rgba(0,255,65,0.03);">
            ITEM: ${redemption.reward_name}<br>
            RECIPIENT: ${redemption.name}<br>
            DECISION: ${finalStatus.toUpperCase()}<br>
            POINTS REFUNDED: ${finalStatus === 'cancelled' ? redemption.points_deducted : 0}<br>
            NOTES: ${finalNotes || 'None'}
          </div>
          <p style="color: #f1f5f9;">
            ${finalStatus === 'fulfilled' 
              ? 'Your incentive has been processed. Our HR department will contact you shortly to coordinate receipt.' 
              : 'Your redemption has been cancelled and points have been refunded to your profile balance.'}
          </p>
          <div style="margin-top: 24px; border-top: 1px dashed #222222; padding-top: 16px; font-size: 11px; color: #555555;">
            EcoSphere Automated Identity Subsystem
          </div>
        </div>
      `;

      sendMail({
        to: redemption.email,
        subject: `Incentive Redemption processed: ${finalStatus.toUpperCase()}`,
        html: htmlContent
      }).catch(mailErr => {
        logger.error('Failed to send redemption email notification', { error: mailErr.message });
      });
    }

    logger.info('Processed reward redemption status', { redemptionId, status: finalStatus });
    return successResponse(null, `Redemption request successfully ${finalStatus}.`);
  } catch (err) {
    logger.error('PUT /api/gamification/rewards error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
