// src/services/policyService.ts
// DB access for ESG policies.

import pool from '@/config/db';
import logger from '@/lib/logger';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type EntityStatus = 'active' | 'inactive' | 'draft' | 'archived';

export interface EsgPolicy extends RowDataPacket {
  id: number;
  title: string;
  category: string | null;
  version: string;
  content: string | null;
  effective_date: string;
  expiry_date: string | null;
  requires_acknowledgement: number;
  status: EntityStatus;
  created_by: number | null;
  created_by_name: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  created_at: string;
  updated_at: string;
  acknowledgement_count: number;
  pending_user_count?: number;
  user_has_acknowledged?: number;
}

export interface CreatePolicyInput {
  title: string;
  category?: string | null;
  version?: string;
  content?: string | null;
  effective_date: string;
  expiry_date?: string | null;
  requires_acknowledgement?: boolean;
  status?: EntityStatus;
  created_by?: number | null;
  approved_by?: number | null;
}

export interface UpdatePolicyInput {
  title?: string;
  category?: string | null;
  version?: string;
  content?: string | null;
  effective_date?: string;
  expiry_date?: string | null;
  requires_acknowledgement?: boolean;
  status?: EntityStatus;
  approved_by?: number | null;
}

function normalize(row: EsgPolicy): EsgPolicy {
  return {
    ...row,
    requires_acknowledgement: Number(row.requires_acknowledgement),
    acknowledgement_count: Number(row.acknowledgement_count ?? 0),
    pending_user_count: Number(row.pending_user_count ?? 0),
    user_has_acknowledged: Number(row.user_has_acknowledged ?? 0),
  };
}

export async function listPolicies(options?: {
  status?: EntityStatus | 'all';
  userId?: number;
}): Promise<EsgPolicy[]> {
  try {
    const clauses: string[] = [];
    const params: Array<string | number | boolean | null> = [];

    if (options?.status && options.status !== 'all') {
      clauses.push('p.status = ?');
      params.push(options.status);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const userId = options?.userId ?? null;

    const [rows] = await pool.execute<EsgPolicy[]>(
      `SELECT p.id, p.title, p.category, p.version, p.content, p.effective_date,
              p.expiry_date, p.requires_acknowledgement, p.status, p.created_by,
              c.name AS created_by_name, p.approved_by, a.name AS approved_by_name,
              p.created_at, p.updated_at,
              COUNT(DISTINCT pa.id) AS acknowledgement_count,
              CASE
                WHEN p.requires_acknowledgement = 0 THEN 0
                ELSE GREATEST(
                  0,
                  (SELECT COUNT(*) FROM users u2 WHERE u2.status = 'active')
                  - COUNT(DISTINCT pa.id)
                )
              END AS pending_user_count,
              CASE
                WHEN ? IS NULL THEN 0
                WHEN EXISTS (
                  SELECT 1 FROM policy_acknowledgements pa2
                  WHERE pa2.policy_id = p.id
                    AND pa2.user_id = ?
                    AND pa2.policy_version = p.version
                ) THEN 1
                ELSE 0
              END AS user_has_acknowledged
       FROM esg_policies p
       LEFT JOIN users c ON c.id = p.created_by
       LEFT JOIN users a ON a.id = p.approved_by
       LEFT JOIN policy_acknowledgements pa
         ON pa.policy_id = p.id AND pa.policy_version = p.version
       ${where}
       GROUP BY p.id
       ORDER BY
         CASE p.status
           WHEN 'active' THEN 0
           WHEN 'draft' THEN 1
           WHEN 'inactive' THEN 2
           ELSE 3
         END,
         p.effective_date DESC,
         p.id DESC`,
      [userId, userId, ...params],
    );
    return rows.map(normalize);
  } catch (err) {
    logger.error('listPolicies failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getPolicyById(id: number, userId?: number): Promise<EsgPolicy | null> {
  try {
    const rows = await listPolicies({ status: 'all', userId });
    return rows.find((r) => r.id === id) ?? null;
  } catch (err) {
    logger.error('getPolicyById failed', { error: (err as Error).message, id });
    throw err;
  }
}

export async function createPolicy(input: CreatePolicyInput): Promise<EsgPolicy> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO esg_policies
         (title, category, version, content, effective_date, expiry_date,
          requires_acknowledgement, status, created_by, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.title.trim(),
        input.category?.trim() || null,
        input.version?.trim() || '1.0',
        input.content?.trim() || null,
        input.effective_date,
        input.expiry_date || null,
        input.requires_acknowledgement === false ? 0 : 1,
        input.status ?? 'active',
        input.created_by ?? null,
        input.approved_by ?? null,
      ],
    );

    const created = await getPolicyById(result.insertId);
    if (!created) throw new Error('POLICY_CREATE_FAILED');
    logger.info('Policy created', { id: created.id, title: created.title });
    return created;
  } catch (err) {
    logger.error('createPolicy failed', { error: (err as Error).message });
    throw err;
  }
}

export async function updatePolicy(
  id: number,
  input: UpdatePolicyInput,
): Promise<EsgPolicy | null> {
  try {
    const fields: string[] = [];
    const values: Array<string | number | boolean | null> = [];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title.trim());
    }
    if (input.category !== undefined) {
      fields.push('category = ?');
      values.push(input.category?.trim() || null);
    }
    if (input.version !== undefined) {
      fields.push('version = ?');
      values.push(input.version.trim());
    }
    if (input.content !== undefined) {
      fields.push('content = ?');
      values.push(input.content?.trim() || null);
    }
    if (input.effective_date !== undefined) {
      fields.push('effective_date = ?');
      values.push(input.effective_date);
    }
    if (input.expiry_date !== undefined) {
      fields.push('expiry_date = ?');
      values.push(input.expiry_date || null);
    }
    if (input.requires_acknowledgement !== undefined) {
      fields.push('requires_acknowledgement = ?');
      values.push(input.requires_acknowledgement ? 1 : 0);
    }
    if (input.status !== undefined) {
      fields.push('status = ?');
      values.push(input.status);
    }
    if (input.approved_by !== undefined) {
      fields.push('approved_by = ?');
      values.push(input.approved_by);
    }

    if (fields.length === 0) return getPolicyById(id);

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE esg_policies SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    if (result.affectedRows === 0) return null;
    logger.info('Policy updated', { id });
    return getPolicyById(id);
  } catch (err) {
    logger.error('updatePolicy failed', { error: (err as Error).message, id });
    throw err;
  }
}

export async function getPolicyStats(): Promise<{
  total: number;
  active: number;
  requiring_ack: number;
  total_acknowledgements: number;
}> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN status = 'active' AND requires_acknowledgement = 1 THEN 1 ELSE 0 END) AS requiring_ack
       FROM esg_policies`,
    );
    const [acks] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total_acknowledgements FROM policy_acknowledgements`,
    );
    return {
      total: Number(rows[0]?.total ?? 0),
      active: Number(rows[0]?.active ?? 0),
      requiring_ack: Number(rows[0]?.requiring_ack ?? 0),
      total_acknowledgements: Number(acks[0]?.total_acknowledgements ?? 0),
    };
  } catch (err) {
    logger.error('getPolicyStats failed', { error: (err as Error).message });
    throw err;
  }
}
