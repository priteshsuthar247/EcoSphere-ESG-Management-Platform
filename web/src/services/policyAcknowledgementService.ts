// src/services/policyAcknowledgementService.ts
// DB access for policy acknowledgements.

import pool from '@/config/db';
import logger from '@/lib/logger';
import { getPolicyById } from '@/services/policyService';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface PolicyAcknowledgement extends RowDataPacket {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_department_id: number | null;
  user_department_name: string | null;
  policy_id: number;
  policy_title: string;
  policy_status: string;
  policy_version_current: string;
  acknowledged_at: string;
  policy_version: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface PendingAcknowledgement extends RowDataPacket {
  policy_id: number;
  title: string;
  version: string;
  category: string | null;
  effective_date: string;
  expiry_date: string | null;
  requires_acknowledgement: number;
}

export async function listAcknowledgements(options?: {
  departmentId?: number | null;
  policyId?: number;
  userId?: number;
}): Promise<PolicyAcknowledgement[]> {
  try {
    const clauses: string[] = [];
    const params: Array<string | number | boolean | null> = [];

    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('u.department_id = ?');
      params.push(options.departmentId);
    }
    if (options?.policyId !== undefined) {
      clauses.push('pa.policy_id = ?');
      params.push(options.policyId);
    }
    if (options?.userId !== undefined) {
      clauses.push('pa.user_id = ?');
      params.push(options.userId);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute<PolicyAcknowledgement[]>(
      `SELECT pa.id, pa.user_id, u.name AS user_name, u.email AS user_email,
              u.department_id AS user_department_id, d.name AS user_department_name,
              pa.policy_id, p.title AS policy_title, p.status AS policy_status,
              p.version AS policy_version_current, pa.acknowledged_at,
              pa.policy_version, pa.ip_address, pa.user_agent
       FROM policy_acknowledgements pa
       INNER JOIN users u ON u.id = pa.user_id
       INNER JOIN esg_policies p ON p.id = pa.policy_id
       LEFT JOIN departments d ON d.id = u.department_id
       ${where}
       ORDER BY pa.acknowledged_at DESC`,
      params,
    );
    return rows;
  } catch (err) {
    logger.error('listAcknowledgements failed', { error: (err as Error).message });
    throw err;
  }
}

export async function listPendingForUser(userId: number): Promise<PendingAcknowledgement[]> {
  try {
    const [rows] = await pool.execute<PendingAcknowledgement[]>(
      `SELECT p.id AS policy_id, p.title, p.version, p.category,
              p.effective_date, p.expiry_date, p.requires_acknowledgement
       FROM esg_policies p
       WHERE p.status = 'active'
         AND p.requires_acknowledgement = 1
         AND NOT EXISTS (
           SELECT 1 FROM policy_acknowledgements pa
           WHERE pa.policy_id = p.id
             AND pa.user_id = ?
             AND pa.policy_version = p.version
         )
       ORDER BY p.effective_date ASC`,
      [userId],
    );
    return rows.map((r) => ({
      ...r,
      requires_acknowledgement: Number(r.requires_acknowledgement),
    }));
  } catch (err) {
    logger.error('listPendingForUser failed', { error: (err as Error).message, userId });
    throw err;
  }
}

export async function acknowledgePolicy(params: {
  userId: number;
  policyId: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<PolicyAcknowledgement> {
  const policy = await getPolicyById(params.policyId);
  if (!policy) throw new Error('POLICY_NOT_FOUND');
  if (policy.status !== 'active') throw new Error('POLICY_NOT_ACTIVE');
  if (!policy.requires_acknowledgement) throw new Error('ACK_NOT_REQUIRED');

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO policy_acknowledgements
         (user_id, policy_id, policy_version, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [
        params.userId,
        params.policyId,
        policy.version,
        params.ipAddress ?? null,
        params.userAgent ?? null,
      ],
    );

    const [rows] = await pool.execute<PolicyAcknowledgement[]>(
      `SELECT pa.id, pa.user_id, u.name AS user_name, u.email AS user_email,
              u.department_id AS user_department_id, d.name AS user_department_name,
              pa.policy_id, p.title AS policy_title, p.status AS policy_status,
              p.version AS policy_version_current, pa.acknowledged_at,
              pa.policy_version, pa.ip_address, pa.user_agent
       FROM policy_acknowledgements pa
       INNER JOIN users u ON u.id = pa.user_id
       INNER JOIN esg_policies p ON p.id = pa.policy_id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE pa.id = ?
       LIMIT 1`,
      [result.insertId],
    );

    const created = rows[0];
    if (!created) throw new Error('ACK_CREATE_FAILED');
    logger.info('Policy acknowledged', {
      userId: params.userId,
      policyId: params.policyId,
      version: policy.version,
    });
    return created;
  } catch (err) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new Error('ALREADY_ACKNOWLEDGED');
    }
    logger.error('acknowledgePolicy failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getAcknowledgementStats(options?: {
  departmentId?: number | null;
}): Promise<{
  total: number;
  unique_users: number;
  unique_policies: number;
  pending_acks: number;
}> {
  try {
    const clauses: string[] = [];
    const params: Array<string | number | boolean | null> = [];
    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('u.department_id = ?');
      params.push(options.departmentId);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         COUNT(DISTINCT pa.user_id) AS unique_users,
         COUNT(DISTINCT pa.policy_id) AS unique_policies
       FROM policy_acknowledgements pa
       INNER JOIN users u ON u.id = pa.user_id
       ${where}`,
      params,
    );

    // Pending = active users * active ack-required policies - existing matching acks
    // Simplified org-wide pending count for active policies
    const [pending] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS pending_acks
       FROM esg_policies p
       CROSS JOIN users u
       WHERE p.status = 'active'
         AND p.requires_acknowledgement = 1
         AND u.status = 'active'
         ${options?.departmentId != null ? 'AND u.department_id = ?' : ''}
         AND NOT EXISTS (
           SELECT 1 FROM policy_acknowledgements pa
           WHERE pa.policy_id = p.id
             AND pa.user_id = u.id
             AND pa.policy_version = p.version
         )`,
      options?.departmentId != null ? [options.departmentId] : [],
    );

    return {
      total: Number(rows[0]?.total ?? 0),
      unique_users: Number(rows[0]?.unique_users ?? 0),
      unique_policies: Number(rows[0]?.unique_policies ?? 0),
      pending_acks: Number(pending[0]?.pending_acks ?? 0),
    };
  } catch (err) {
    logger.error('getAcknowledgementStats failed', { error: (err as Error).message });
    throw err;
  }
}

/**
 * Coverage matrix: policies requiring ack with acknowledged vs active user counts.
 */
export async function getCoverageMatrix(): Promise<
  {
    policy_id: number;
    title: string;
    version: string;
    status: string;
    acknowledged: number;
    active_users: number;
    coverage_percent: number;
  }[]
> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id AS policy_id, p.title, p.version, p.status,
              COUNT(DISTINCT pa.user_id) AS acknowledged,
              (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users
       FROM esg_policies p
       LEFT JOIN policy_acknowledgements pa
         ON pa.policy_id = p.id AND pa.policy_version = p.version
       WHERE p.requires_acknowledgement = 1
         AND p.status IN ('active', 'inactive')
       GROUP BY p.id
       ORDER BY p.title ASC`,
    );

    return rows.map((r) => {
      const acknowledged = Number(r.acknowledged);
      const activeUsers = Number(r.active_users);
      return {
        policy_id: Number(r.policy_id),
        title: String(r.title),
        version: String(r.version),
        status: String(r.status),
        acknowledged,
        active_users: activeUsers,
        coverage_percent:
          activeUsers > 0
            ? Number(((acknowledged / activeUsers) * 100).toFixed(1))
            : 0,
      };
    });
  } catch (err) {
    logger.error('getCoverageMatrix failed', { error: (err as Error).message });
    throw err;
  }
}
