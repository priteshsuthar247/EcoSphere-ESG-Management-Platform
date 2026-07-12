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
import { escapeHtml } from '@/lib/htmlEscape';

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

    // Scope redemptions by role
    if (payload.role === 'employee') {
      query += ' WHERE rr.user_id = ?';
      values.push(payload.id);
    } else if (payload.role === 'departmental_head') {
      if (payload.department_id == null) {
        query += ' WHERE rr.user_id = ?';
        values.push(payload.id);
      } else {
        query += ' WHERE u.department_id = ?';
        values.push(payload.department_id);
      }
    }
    // admin + ceo: all redemptions

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
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return errorResponse('Access denied. Authorization required.', 401, 'UNAUTHORIZED');
    }
    const payload = verifyToken(token);
    if (!payload) {
      return errorResponse('Access denied. Invalid token.', 401, 'UNAUTHORIZED');
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

    const bodyObj = body as Record<string, unknown>;
    const action = typeof bodyObj.action === 'string' ? bodyObj.action : 'create';

    // ── Employee (or any authed user) redeem from catalog ──
    if (action === 'redeem') {
      const rewardId = typeof bodyObj.rewardId === 'number'
        ? bodyObj.rewardId
        : Number(bodyObj.rewardId ?? bodyObj.reward_id);
      if (!Number.isInteger(rewardId) || rewardId <= 0) {
        return errorResponse('Valid rewardId is required', 400, 'VALIDATION_ERROR');
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [rewardRows] = await conn.execute<RowDataPacket[]>(
          `SELECT id, name, points_required, stock_quantity, status
           FROM rewards WHERE id = ? LIMIT 1 FOR UPDATE`,
          [rewardId],
        );
        const reward = rewardRows[0];
        if (!reward || reward.status !== 'active') {
          await conn.rollback();
          return errorResponse('Reward not available', 404, 'NOT_FOUND');
        }
        if (Number(reward.stock_quantity) <= 0) {
          await conn.rollback();
          return errorResponse('Reward is out of stock', 400, 'OUT_OF_STOCK');
        }

        const [userRows] = await conn.execute<RowDataPacket[]>(
          `SELECT id, esg_points_balance, name, email FROM users WHERE id = ? AND status = 'active' LIMIT 1 FOR UPDATE`,
          [payload.id],
        );
        const user = userRows[0];
        if (!user) {
          await conn.rollback();
          return errorResponse('User not found', 404, 'NOT_FOUND');
        }

        const balance = Number(user.esg_points_balance);
        const cost = Number(reward.points_required);
        if (!Number.isFinite(balance) || balance < cost) {
          await conn.rollback();
          return errorResponse(
            `Insufficient points. You have ${balance}, need ${cost}.`,
            400,
            'INSUFFICIENT_POINTS',
          );
        }

        // Count open pending redemptions so stock is not oversold
        const [pendingRows] = await conn.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS cnt FROM reward_redemptions
           WHERE reward_id = ? AND status = 'pending'`,
          [rewardId],
        );
        const pendingCount = Number(pendingRows[0]?.cnt ?? 0);
        if (pendingCount >= Number(reward.stock_quantity)) {
          await conn.rollback();
          return errorResponse('Reward is out of stock', 400, 'OUT_OF_STOCK');
        }

        const [balRes] = await conn.execute<ResultSetHeader>(
          `UPDATE users SET esg_points_balance = esg_points_balance - ?
           WHERE id = ? AND esg_points_balance >= ?`,
          [cost, payload.id, cost],
        );
        if (balRes.affectedRows === 0) {
          await conn.rollback();
          return errorResponse('Insufficient points', 400, 'INSUFFICIENT_POINTS');
        }

        const [insertRes] = await conn.execute<ResultSetHeader>(
          `INSERT INTO reward_redemptions (user_id, reward_id, points_deducted, status)
           VALUES (?, ?, ?, 'pending')`,
          [payload.id, rewardId, cost],
        );

        await conn.commit();

        const { notifyUser } = await import('@/services/notificationService');
        await notifyUser({
          userId: payload.id,
          type: 'reward_redemption',
          title: 'Reward redemption submitted',
          message: `You redeemed "${reward.name}" for ${cost} points. Status: pending fulfillment.`,
          actionUrl: '/dashboard/gamification/rewards',
          relatedEntityType: 'reward_redemption',
          relatedEntityId: insertRes.insertId,
          emailSubject: `Redemption submitted: ${reward.name}`,
        });

        logger.info('Reward redeemed', {
          userId: payload.id,
          rewardId,
          cost,
          redemptionId: insertRes.insertId,
        });

        return successResponse(
          {
            id: insertRes.insertId,
            reward_id: rewardId,
            points_deducted: cost,
            status: 'pending',
          },
          'Reward redeemed successfully. Points deducted.',
          201,
        );
      } catch (txErr) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }
    }

    // ── Admin create catalog item ──
    if (!isAdmin(request)) {
      return errorResponse('Access denied. Admin role required.', 403, 'UNAUTHORIZED');
    }

    const { name, description, pointsRequired, stockQuantity, category, status } = bodyObj;

    if (typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('Valid name is required (min 2 chars)', 400, 'VALIDATION_ERROR');
    }
    const pts =
      typeof pointsRequired === 'number' ? pointsRequired : Number(pointsRequired);
    if (!Number.isFinite(pts) || pts < 0) {
      return errorResponse('Points required must be a non-negative number', 400, 'VALIDATION_ERROR');
    }

    const finalStockQuantity =
      typeof stockQuantity === 'number' ? stockQuantity : Number(stockQuantity) || 0;
    const finalCategory = typeof category === 'string' ? category.trim() : 'gift';
    const finalStatus =
      typeof status === 'string' &&
      ['active', 'inactive', 'draft', 'archived'].includes(status)
        ? status
        : 'active';

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO rewards (name, description, points_required, stock_quantity, category, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        typeof description === 'string' ? description.trim() : null,
        pts,
        finalStockQuantity,
        finalCategory,
        finalStatus,
      ],
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

    const { redemptionId: rawRedemptionId, status, notes } = body as Record<string, unknown>;
    const redemptionId =
      typeof rawRedemptionId === 'number' ? rawRedemptionId : Number(rawRedemptionId);

    if (!Number.isInteger(redemptionId) || redemptionId <= 0) {
      return errorResponse('Valid redemption ID is required', 400, 'VALIDATION_ERROR');
    }
    if (typeof status !== 'string' || !['fulfilled', 'cancelled'].includes(status)) {
      return errorResponse('Valid status (fulfilled/cancelled) is required', 400, 'VALIDATION_ERROR');
    }

    const token = request.cookies.get('auth-token')?.value;
    const payload = verifyToken(token!);
    if (!payload?.id) {
      return errorResponse('Access denied. Invalid session.', 401, 'UNAUTHORIZED');
    }
    const adminUserId = payload.id;

    const finalStatus = status as 'fulfilled' | 'cancelled';
    const finalNotes = typeof notes === 'string' ? notes.trim() : null;

    // Begin database transaction + row lock (prevents double fulfill/refund)
    const conn = await pool.getConnection();
    let redemption: RowDataPacket;
    try {
      await conn.beginTransaction();
      const [redRows] = await conn.execute<RowDataPacket[]>(`
        SELECT rr.user_id, rr.reward_id, rr.points_deducted, rr.status, u.email, u.name, rw.name AS reward_name
        FROM reward_redemptions rr
        JOIN users u ON u.id = rr.user_id
        JOIN rewards rw ON rw.id = rr.reward_id
        WHERE rr.id = ?
        LIMIT 1
        FOR UPDATE
      `, [redemptionId]);

      redemption = redRows[0];
      if (!redemption) {
        await conn.rollback();
        return errorResponse('Redemption record not found', 404, 'NOT_FOUND');
      }

      if (redemption.status !== 'pending') {
        await conn.rollback();
        return errorResponse('This redemption request has already been processed', 400, 'ALREADY_PROCESSED');
      }

      await conn.execute(
        `UPDATE reward_redemptions 
         SET status = ?, fulfilled_by = ?, fulfilled_at = NOW(), notes = ?
         WHERE id = ? AND status = 'pending'`,
        [finalStatus, adminUserId, finalNotes, redemptionId]
      );

      if (finalStatus === 'fulfilled') {
        // Consume one unit of stock on fulfillment
        await conn.execute(
          'UPDATE rewards SET stock_quantity = GREATEST(stock_quantity - 1, 0) WHERE id = ?',
          [redemption.reward_id],
        );
      } else if (finalStatus === 'cancelled') {
        // Refund points; stock unchanged (never reserved until fulfill)
        await conn.execute(
          'UPDATE users SET esg_points_balance = esg_points_balance + ? WHERE id = ?',
          [redemption.points_deducted, redemption.user_id],
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
            ITEM: ${escapeHtml(redemption.reward_name)}<br>
            RECIPIENT: ${escapeHtml(redemption.name)}<br>
            DECISION: ${escapeHtml(finalStatus.toUpperCase())}<br>
            POINTS REFUNDED: ${finalStatus === 'cancelled' ? escapeHtml(redemption.points_deducted) : 0}<br>
            NOTES: ${escapeHtml(finalNotes || 'None')}
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
