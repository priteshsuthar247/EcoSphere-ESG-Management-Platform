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
import { awardEligibleBadges } from '@/services/badgeService';
import { escapeHtml } from '@/lib/htmlEscape';

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

// Check if user is manager / admin / ceo
function isElevatedUser(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  return payload?.role === 'admin' || payload?.role === 'departmental_head' || payload?.role === 'ceo';
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
    const status = (searchParams.get('status') || 'all').trim() || 'all';

    const clauses: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];

    // Scope data by role (prevent department-wide / org-wide leaks)
    if (payload.role === 'employee') {
      clauses.push('cp.user_id = ?');
      values.push(payload.id);
    } else if (payload.role === 'departmental_head') {
      if (payload.department_id == null) {
        clauses.push('cp.user_id = ?');
        values.push(payload.id);
      } else {
        clauses.push('u.department_id = ?');
        values.push(payload.department_id);
      }
    }
    // admin + ceo: all rows

    if (status && status !== 'all') {
      clauses.push('cp.approval_status = ?');
      values.push(status);
    }
    if (search) {
      const q = `%${search.replace(/[%_]/g, '\\$&')}%`;
      clauses.push(
        '(u.name LIKE ? OR u.email LIKE ? OR c.title LIKE ? OR CAST(cp.id AS CHAR) LIKE ?)',
      );
      values.push(q, q, q, q);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `
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
      ${where}
      ORDER BY cp.id DESC
    `;

    const [rows] = await pool.execute<ParticipationRow[]>(query, values);
    return successResponse(rows, 'Participations list retrieved');
  } catch (err) {
    logger.error('GET /api/gamification/participation error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

/**
 * POST — join a challenge or submit proof of completion
 * Body: { action: 'join', challenge_id } | { action: 'submit', id|participation_id, proof_url?, progress_percent? }
 */
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

    const obj = body as Record<string, unknown>;
    const action = typeof obj.action === 'string' ? obj.action : 'join';

    if (action === 'join') {
      const challengeId = Number(obj.challenge_id ?? obj.challengeId);
      if (!Number.isInteger(challengeId) || challengeId <= 0) {
        return errorResponse('Valid challenge_id is required', 400, 'VALIDATION_ERROR');
      }

      const [chRows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, status, max_participants, title FROM challenges WHERE id = ? LIMIT 1`,
        [challengeId],
      );
      const ch = chRows[0];
      if (!ch) {
        return errorResponse('Challenge not found', 404, 'NOT_FOUND');
      }
      if (ch.status !== 'active') {
        return errorResponse('Only active challenges can be joined', 400, 'NOT_ACTIVE');
      }

      if (ch.max_participants != null) {
        const [cntRows] = await pool.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS cnt FROM challenge_participations WHERE challenge_id = ?`,
          [challengeId],
        );
        if (Number(cntRows[0]?.cnt) >= Number(ch.max_participants)) {
          return errorResponse('Challenge is full', 400, 'FULL');
        }
      }

      try {
        const [ins] = await pool.execute<ResultSetHeader>(
          `INSERT INTO challenge_participations
             (user_id, challenge_id, progress_percent, approval_status)
           VALUES (?, ?, 0, 'pending')`,
          [payload.id, challengeId],
        );
        logger.info('User joined challenge', {
          userId: payload.id,
          challengeId,
          participationId: ins.insertId,
        });
        return successResponse(
          { id: ins.insertId, challenge_id: challengeId, status: 'pending' },
          'Joined challenge successfully',
          201,
        );
      } catch (e) {
        if ((e as { code?: string }).code === 'ER_DUP_ENTRY') {
          return errorResponse('Already joined this challenge', 409, 'ALREADY_JOINED');
        }
        throw e;
      }
    }

    if (action === 'submit') {
      const participationId = Number(obj.id ?? obj.participation_id);
      if (!Number.isInteger(participationId) || participationId <= 0) {
        return errorResponse('Valid participation id is required', 400, 'VALIDATION_ERROR');
      }

      const [partRows] = await pool.execute<RowDataPacket[]>(
        `SELECT cp.id, cp.user_id, cp.approval_status, c.evidence_required, c.title
         FROM challenge_participations cp
         JOIN challenges c ON c.id = cp.challenge_id
         WHERE cp.id = ? LIMIT 1`,
        [participationId],
      );
      const part = partRows[0];
      if (!part) {
        return errorResponse('Participation not found', 404, 'NOT_FOUND');
      }
      if (Number(part.user_id) !== payload.id && !isElevatedUser(request)) {
        return errorResponse('Access denied', 403, 'FORBIDDEN');
      }
      if (part.approval_status === 'approved') {
        return errorResponse('Already approved', 400, 'ALREADY_APPROVED');
      }

      let proofAttachmentId: number | null = null;
      const proofUrl = typeof obj.proof_url === 'string' ? obj.proof_url.trim() : '';
      if (proofUrl) {
        const [att] = await pool.execute<ResultSetHeader>(
          `INSERT INTO attachments
             (entity_type, entity_id, file_name, storage_url, mime_type, uploaded_by, description)
           VALUES ('challenge_participation', ?, ?, ?, 'text/uri-list', ?, ?)`,
          [
            participationId,
            typeof obj.proof_file_name === 'string' ? obj.proof_file_name : 'challenge-proof',
            proofUrl,
            payload.id,
            'Challenge completion proof',
          ],
        );
        proofAttachmentId = att.insertId;
      }

      const progress =
        obj.progress_percent === undefined || obj.progress_percent === null
          ? 100
          : Number(obj.progress_percent);

      await pool.execute(
        `UPDATE challenge_participations
         SET progress_percent = ?,
             proof_attachment_id = COALESCE(?, proof_attachment_id),
             approval_status = 'pending',
             completed_at = NOW()
         WHERE id = ?`,
        [
          Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 100,
          proofAttachmentId,
          participationId,
        ],
      );

      logger.info('Challenge proof submitted', {
        participationId,
        userId: payload.id,
      });
      return successResponse({ id: participationId }, 'Proof submitted for review');
    }

    return errorResponse('Unknown action. Use join or submit.', 400, 'VALIDATION_ERROR');
  } catch (err) {
    logger.error('POST /api/gamification/participation error', {
      error: (err as Error).message,
    });
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

    const { id: rawId, status } = body as Record<string, unknown>;

    const id = typeof rawId === 'number' ? rawId : Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse('Valid participation ID is required', 400, 'VALIDATION_ERROR');
    }

    if (typeof status !== 'string' || !['approved', 'rejected'].includes(status)) {
      return errorResponse('Valid status (approved/rejected) is required', 400, 'VALIDATION_ERROR');
    }

    const token = request.cookies.get('auth-token')?.value;
    const payload = verifyToken(token!);
    if (!payload?.id) {
      return errorResponse('Access denied. Invalid session.', 401, 'UNAUTHORIZED');
    }
    const reviewerUserId = payload.id;

    // Department heads may only review employees in their department
    if (payload.role === 'departmental_head') {
      if (payload.department_id == null) {
        return errorResponse(
          'Access denied. Assign a department to your account before reviewing submissions.',
          403,
          'FORBIDDEN',
        );
      }
      const [scopeCheck] = await pool.execute<RowDataPacket[]>(
        `SELECT u.department_id
         FROM challenge_participations cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.id = ? LIMIT 1`,
        [id],
      );
      const targetDept = scopeCheck[0]?.department_id ?? null;
      if (targetDept !== payload.department_id) {
        return errorResponse('Access denied. Outside your department scope.', 403, 'FORBIDDEN');
      }
    }

    const finalStatus = status as 'approved' | 'rejected';

    // Transaction + row lock prevents double-award race conditions
    const conn = await pool.getConnection();
    let part: RowDataPacket;
    let xpAwarded = 0;
    try {
      await conn.beginTransaction();
      const [partRows] = await conn.execute<RowDataPacket[]>(`
        SELECT cp.user_id, cp.approval_status, c.xp_reward, u.email, u.name, c.title AS challenge_title
        FROM challenge_participations cp
        JOIN challenges c ON c.id = cp.challenge_id
        JOIN users u ON u.id = cp.user_id
        WHERE cp.id = ?
        LIMIT 1
        FOR UPDATE
      `, [id]);

      part = partRows[0];
      if (!part) {
        await conn.rollback();
        return errorResponse('Participation log not found', 404, 'NOT_FOUND');
      }

      if (part.approval_status !== 'pending') {
        await conn.rollback();
        return errorResponse('This submission has already been reviewed', 400, 'ALREADY_REVIEWED');
      }

      // Evidence required on challenge: block approve without proof
      if (finalStatus === 'approved') {
        const [evRows] = await conn.execute<RowDataPacket[]>(
          `SELECT c.evidence_required, cp.proof_attachment_id
           FROM challenge_participations cp
           JOIN challenges c ON c.id = cp.challenge_id
           WHERE cp.id = ? LIMIT 1`,
          [id],
        );
        const ev = evRows[0];
        if (ev && Number(ev.evidence_required) === 1 && !ev.proof_attachment_id) {
          await conn.rollback();
          return errorResponse(
            'Evidence/proof is required before this challenge can be approved.',
            400,
            'PROOF_REQUIRED',
          );
        }
      }

      xpAwarded = finalStatus === 'approved' ? Number(part.xp_reward) || 0 : 0;

      await conn.execute(
        `UPDATE challenge_participations 
         SET approval_status = ?, xp_awarded = ?, approved_by = ?, completed_at = IF(?, NOW(), NULL)
         WHERE id = ? AND approval_status = 'pending'`,
        [finalStatus, xpAwarded, reviewerUserId, finalStatus === 'approved' ? 1 : 0, id]
      );

      if (finalStatus === 'approved' && xpAwarded > 0) {
        await conn.execute(
          `UPDATE users 
           SET total_xp = total_xp + ?, esg_points_balance = esg_points_balance + ?
           WHERE id = ?`,
          [xpAwarded, xpAwarded, part.user_id]
        );
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    if (finalStatus === 'approved') {
      logger.info('Approved challenge participation, points awarded', { userId: part.user_id, xpAwarded });
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
            CHALLENGE: ${escapeHtml(part.challenge_title)}<br>
            PARTICIPANT: ${escapeHtml(part.name)}<br>
            DECISION: ${escapeHtml(finalStatus.toUpperCase())}<br>
            XP/POINTS EARNED: ${escapeHtml(xpAwarded)}
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
