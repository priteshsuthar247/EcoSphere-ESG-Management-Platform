// src/services/csrParticipationService.ts
// DB access for employee CSR participation & approvals.

import pool from '@/config/db';
import logger from '@/lib/logger';
import { getCsrActivityById } from '@/services/csrActivityService';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface CsrParticipation extends RowDataPacket {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_department_id: number | null;
  user_department_name: string | null;
  csr_activity_id: number;
  activity_title: string;
  activity_status: string;
  activity_points: number;
  evidence_required: number;
  scheduled_date: string | null;
  joined_at: string;
  completion_date: string | null;
  proof_attachment_id: number | null;
  proof_url: string | null;
  approval_status: ApprovalStatus;
  points_earned: number;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
}

function normalize(row: CsrParticipation): CsrParticipation {
  return {
    ...row,
    activity_points: Number(row.activity_points),
    evidence_required: Number(row.evidence_required),
    points_earned: Number(row.points_earned),
  };
}

export async function listParticipations(options?: {
  userId?: number;
  departmentId?: number | null;
  approvalStatus?: ApprovalStatus | 'all';
  activityId?: number;
  search?: string;
}): Promise<CsrParticipation[]> {
  try {
    const clauses: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    if (options?.userId !== undefined) {
      clauses.push('p.user_id = ?');
      params.push(options.userId);
    }
    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('u.department_id = ?');
      params.push(options.departmentId);
    }
    if (options?.approvalStatus && options.approvalStatus !== 'all') {
      clauses.push('p.approval_status = ?');
      params.push(options.approvalStatus);
    }
    if (options?.activityId !== undefined) {
      clauses.push('p.csr_activity_id = ?');
      params.push(options.activityId);
    }
    if (options?.search?.trim()) {
      const q = `%${options.search.trim().replace(/[%_]/g, '\\$&')}%`;
      clauses.push(
        `(u.name LIKE ? OR u.email LIKE ? OR a.title LIKE ? OR d.name LIKE ?
          OR p.rejection_reason LIKE ? OR CAST(p.id AS CHAR) LIKE ?)`,
      );
      params.push(q, q, q, q, q, q);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute<CsrParticipation[]>(
      `SELECT p.id, p.user_id, u.name AS user_name, u.email AS user_email,
              u.department_id AS user_department_id, d.name AS user_department_name,
              p.csr_activity_id, a.title AS activity_title, a.status AS activity_status,
              a.points_awarded AS activity_points, a.evidence_required,
              a.scheduled_date, p.joined_at, p.completion_date,
              p.proof_attachment_id, att.storage_url AS proof_url,
              p.approval_status, p.points_earned, p.approved_by,
              appr.name AS approved_by_name, p.approved_at, p.rejection_reason
       FROM employee_csr_participations p
       INNER JOIN users u ON u.id = p.user_id
       INNER JOIN csr_activities a ON a.id = p.csr_activity_id
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN attachments att ON att.id = p.proof_attachment_id
       LEFT JOIN users appr ON appr.id = p.approved_by
       ${where}
       ORDER BY
         FIELD(p.approval_status, 'pending', 'approved', 'rejected'),
         p.joined_at DESC`,
      params,
    );
    return rows.map(normalize);
  } catch (err) {
    logger.error('listParticipations failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getParticipationById(
  id: number,
): Promise<CsrParticipation | null> {
  const rows = await listParticipations();
  return rows.find((r) => r.id === id) ?? null;
}

export async function joinCsrActivity(params: {
  userId: number;
  activityId: number;
}): Promise<CsrParticipation> {
  const { userId, activityId } = params;
  const activity = await getCsrActivityById(activityId);
  if (!activity) throw new Error('ACTIVITY_NOT_FOUND');
  // Completed / cancelled / archived activities are closed for new joiners
  if (['cancelled', 'archived', 'completed'].includes(activity.status)) {
    throw new Error('ACTIVITY_NOT_JOINABLE');
  }

  if (
    activity.max_participants !== null &&
    activity.participant_count >= activity.max_participants
  ) {
    throw new Error('ACTIVITY_FULL');
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO employee_csr_participations
         (user_id, csr_activity_id, approval_status, points_earned)
       VALUES (?, ?, 'pending', 0)`,
      [userId, activityId],
    );

    const [rows] = await pool.execute<CsrParticipation[]>(
      `SELECT p.id, p.user_id, u.name AS user_name, u.email AS user_email,
              u.department_id AS user_department_id, d.name AS user_department_name,
              p.csr_activity_id, a.title AS activity_title, a.status AS activity_status,
              a.points_awarded AS activity_points, a.evidence_required,
              a.scheduled_date, p.joined_at, p.completion_date,
              p.proof_attachment_id, att.storage_url AS proof_url,
              p.approval_status, p.points_earned, p.approved_by,
              appr.name AS approved_by_name, p.approved_at, p.rejection_reason
       FROM employee_csr_participations p
       INNER JOIN users u ON u.id = p.user_id
       INNER JOIN csr_activities a ON a.id = p.csr_activity_id
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN attachments att ON att.id = p.proof_attachment_id
       LEFT JOIN users appr ON appr.id = p.approved_by
       WHERE p.id = ?
       LIMIT 1`,
      [result.insertId],
    );

    const created = rows[0];
    if (!created) throw new Error('JOIN_FAILED');
    logger.info('User joined CSR activity', { userId, activityId, participationId: created.id });
    return normalize(created);
  } catch (err) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new Error('ALREADY_JOINED');
    }
    logger.error('joinCsrActivity failed', { error: (err as Error).message });
    throw err;
  }
}

/**
 * Mark completion and optionally attach a proof URL (stored as an attachment row).
 */
export async function submitParticipation(params: {
  participationId: number;
  userId: number;
  completion_date?: string | null;
  proof_url?: string | null;
  proof_file_name?: string | null;
}): Promise<CsrParticipation> {
  const existing = await getParticipationById(params.participationId);
  if (!existing) throw new Error('PARTICIPATION_NOT_FOUND');
  if (existing.user_id !== params.userId) throw new Error('FORBIDDEN');
  if (existing.approval_status === 'approved') throw new Error('ALREADY_APPROVED');

  let proofAttachmentId = existing.proof_attachment_id;

  if (params.proof_url && params.proof_url.trim()) {
    const [attResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO attachments
         (entity_type, entity_id, file_name, storage_url, mime_type, uploaded_by, description)
       VALUES ('csr_participation', ?, ?, ?, 'text/uri-list', ?, ?)`,
      [
        params.participationId,
        params.proof_file_name?.trim() || 'proof-link',
        params.proof_url.trim(),
        params.userId,
        'CSR participation proof link',
      ],
    );
    proofAttachmentId = attResult.insertId;
  }

  await pool.execute(
    `UPDATE employee_csr_participations
     SET completion_date = COALESCE(?, completion_date, CURDATE()),
         proof_attachment_id = ?,
         approval_status = 'pending',
         rejection_reason = NULL
     WHERE id = ?`,
    [
      params.completion_date || null,
      proofAttachmentId,
      params.participationId,
    ],
  );

  logger.info('CSR participation submitted', {
    participationId: params.participationId,
    userId: params.userId,
  });

  const updated = await getParticipationById(params.participationId);
  if (!updated) throw new Error('SUBMIT_FAILED');
  return updated;
}

export async function reviewParticipation(params: {
  participationId: number;
  reviewerId: number;
  decision: 'approved' | 'rejected';
  rejection_reason?: string | null;
  forceWithoutProof?: boolean;
}): Promise<CsrParticipation> {
  const existing = await getParticipationById(params.participationId);
  if (!existing) throw new Error('PARTICIPATION_NOT_FOUND');
  if (existing.approval_status === 'approved') throw new Error('ALREADY_APPROVED');

  if (params.decision === 'approved') {
    // Activity-level evidence OR global Settings → require CSR evidence
    const { getEsgConfig } = await import('@/services/systemConfig');
    const esg = await getEsgConfig();
    const proofRequired =
      Boolean(existing.evidence_required) || esg.requireCsrEvidence;

    if (proofRequired && !existing.proof_attachment_id && !params.forceWithoutProof) {
      throw new Error('PROOF_REQUIRED');
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const points = existing.activity_points;

      await conn.execute(
        `UPDATE employee_csr_participations
         SET approval_status = 'approved',
             points_earned = ?,
             approved_by = ?,
             approved_at = NOW(),
             rejection_reason = NULL,
             completion_date = COALESCE(completion_date, CURDATE())
         WHERE id = ?`,
        [points, params.reviewerId, params.participationId],
      );

      await conn.execute(
        `UPDATE users
         SET esg_points_balance = esg_points_balance + ?
         WHERE id = ?`,
        [points, existing.user_id],
      );

      await conn.commit();
      logger.info('CSR participation approved', {
        participationId: params.participationId,
        points,
        userId: existing.user_id,
      });

      // Auto-award badges when points balance crosses a tier threshold
      const { awardEligibleBadges } = await import('@/services/badgeService');
      await awardEligibleBadges(existing.user_id);
    } catch (err) {
      await conn.rollback();
      logger.error('approve participation failed', { error: (err as Error).message });
      throw err;
    } finally {
      conn.release();
    }
  } else {
    await pool.execute(
      `UPDATE employee_csr_participations
       SET approval_status = 'rejected',
           points_earned = 0,
           approved_by = ?,
           approved_at = NOW(),
           rejection_reason = ?
       WHERE id = ?`,
      [
        params.reviewerId,
        params.rejection_reason?.trim() || 'Rejected by reviewer',
        params.participationId,
      ],
    );
    logger.info('CSR participation rejected', {
      participationId: params.participationId,
    });
  }

  // In-app (+ optional email) decision notification
  try {
    const { notifyUser } = await import('@/services/notificationService');
    const decision = params.decision;
    await notifyUser({
      userId: existing.user_id,
      type: 'csr_approval_decision',
      title: `CSR activity ${decision}`,
      message:
        decision === 'approved'
          ? `Your CSR participation was approved. Points have been added to your balance.`
          : `Your CSR participation was rejected${
              params.rejection_reason ? `: ${params.rejection_reason}` : '.'
            }`,
      actionUrl: '/dashboard/social/participation',
      relatedEntityType: 'csr_participation',
      relatedEntityId: params.participationId,
      emailSubject: `CSR participation ${decision}`,
    });
  } catch {
    // non-fatal
  }

  const updated = await getParticipationById(params.participationId);
  if (!updated) throw new Error('REVIEW_FAILED');
  return updated;
}

export async function getParticipationStats(options?: {
  userId?: number;
  departmentId?: number | null;
}): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  total_points_awarded: number;
}> {
  try {
    const clauses: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    if (options?.userId !== undefined) {
      clauses.push('p.user_id = ?');
      params.push(options.userId);
    }
    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('u.department_id = ?');
      params.push(options.departmentId);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN p.approval_status = 'pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN p.approval_status = 'approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN p.approval_status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
         COALESCE(SUM(p.points_earned), 0) AS total_points_awarded
       FROM employee_csr_participations p
       INNER JOIN users u ON u.id = p.user_id
       ${where}`,
      params,
    );

    return {
      total: Number(rows[0]?.total ?? 0),
      pending: Number(rows[0]?.pending ?? 0),
      approved: Number(rows[0]?.approved ?? 0),
      rejected: Number(rows[0]?.rejected ?? 0),
      total_points_awarded: Number(rows[0]?.total_points_awarded ?? 0),
    };
  } catch (err) {
    logger.error('getParticipationStats failed', { error: (err as Error).message });
    throw err;
  }
}
