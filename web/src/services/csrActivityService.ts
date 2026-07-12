// src/services/csrActivityService.ts
// DB access for CSR activities.

import pool from '@/config/db';
import logger from '@/lib/logger';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CsrActivity extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  scheduled_date: string | null;
  location: string | null;
  max_participants: number | null;
  evidence_required: number;
  points_awarded: number;
  status: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  participant_count: number;
  approved_count: number;
  pending_count: number;
}

export interface CreateCsrActivityInput {
  title: string;
  description?: string | null;
  category_id?: number | null;
  scheduled_date?: string | null;
  location?: string | null;
  max_participants?: number | null;
  evidence_required?: boolean;
  points_awarded?: number;
  status?: string;
  created_by?: number | null;
}

export interface UpdateCsrActivityInput {
  title?: string;
  description?: string | null;
  category_id?: number | null;
  scheduled_date?: string | null;
  location?: string | null;
  max_participants?: number | null;
  evidence_required?: boolean;
  points_awarded?: number;
  status?: string;
}

function normalize(row: CsrActivity): CsrActivity {
  return {
    ...row,
    max_participants: row.max_participants === null ? null : Number(row.max_participants),
    evidence_required: Number(row.evidence_required),
    points_awarded: Number(row.points_awarded),
    participant_count: Number(row.participant_count ?? 0),
    approved_count: Number(row.approved_count ?? 0),
    pending_count: Number(row.pending_count ?? 0),
  };
}

export async function listCsrActivities(options?: {
  status?: string | 'all';
}): Promise<CsrActivity[]> {
  try {
    const clauses: string[] = [];
    const params: Array<string | number | boolean | null> = [];

    if (options?.status && options.status !== 'all') {
      clauses.push('a.status = ?');
      params.push(options.status);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute<CsrActivity[]>(
      `SELECT a.id, a.title, a.description, a.category_id, c.name AS category_name,
              a.scheduled_date, a.location, a.max_participants, a.evidence_required,
              a.points_awarded, a.status, a.created_by, u.name AS created_by_name,
              a.created_at, a.updated_at,
              COUNT(p.id) AS participant_count,
              SUM(CASE WHEN p.approval_status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
              SUM(CASE WHEN p.approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_count
       FROM csr_activities a
       LEFT JOIN categories c ON c.id = a.category_id
       LEFT JOIN users u ON u.id = a.created_by
       LEFT JOIN employee_csr_participations p ON p.csr_activity_id = a.id
       ${where}
       GROUP BY a.id
       ORDER BY
         CASE a.status
           WHEN 'upcoming' THEN 0
           WHEN 'active' THEN 1
           WHEN 'completed' THEN 2
           WHEN 'cancelled' THEN 3
           ELSE 4
         END,
         a.scheduled_date IS NULL,
         a.scheduled_date ASC,
         a.id DESC`,
      params,
    );
    return rows.map(normalize);
  } catch (err) {
    logger.error('listCsrActivities failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getCsrActivityById(id: number): Promise<CsrActivity | null> {
  try {
    const [rows] = await pool.execute<CsrActivity[]>(
      `SELECT a.id, a.title, a.description, a.category_id, c.name AS category_name,
              a.scheduled_date, a.location, a.max_participants, a.evidence_required,
              a.points_awarded, a.status, a.created_by, u.name AS created_by_name,
              a.created_at, a.updated_at,
              COUNT(p.id) AS participant_count,
              SUM(CASE WHEN p.approval_status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
              SUM(CASE WHEN p.approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_count
       FROM csr_activities a
       LEFT JOIN categories c ON c.id = a.category_id
       LEFT JOIN users u ON u.id = a.created_by
       LEFT JOIN employee_csr_participations p ON p.csr_activity_id = a.id
       WHERE a.id = ?
       GROUP BY a.id
       LIMIT 1`,
      [id],
    );
    return rows[0] ? normalize(rows[0]) : null;
  } catch (err) {
    logger.error('getCsrActivityById failed', { error: (err as Error).message, id });
    throw err;
  }
}

export async function createCsrActivity(
  input: CreateCsrActivityInput,
): Promise<CsrActivity> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO csr_activities
         (title, description, category_id, scheduled_date, location,
          max_participants, evidence_required, points_awarded, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.title.trim(),
        input.description?.trim() || null,
        input.category_id ?? null,
        input.scheduled_date || null,
        input.location?.trim() || null,
        input.max_participants ?? null,
        input.evidence_required === false ? 0 : 1,
        input.points_awarded ?? 50,
        input.status ?? 'upcoming',
        input.created_by ?? null,
      ],
    );

    const created = await getCsrActivityById(result.insertId);
    if (!created) throw new Error('CSR_CREATE_FAILED');
    logger.info('CSR activity created', { id: created.id, title: created.title });
    return created;
  } catch (err) {
    logger.error('createCsrActivity failed', { error: (err as Error).message });
    throw err;
  }
}

export async function updateCsrActivity(
  id: number,
  input: UpdateCsrActivityInput,
): Promise<CsrActivity | null> {
  try {
    const fields: string[] = [];
    const values: Array<string | number | boolean | null> = [];

    if (input.title !== undefined) {
      fields.push('title = ?');
      values.push(input.title.trim());
    }
    if (input.description !== undefined) {
      fields.push('description = ?');
      values.push(input.description?.trim() || null);
    }
    if (input.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(input.category_id);
    }
    if (input.scheduled_date !== undefined) {
      fields.push('scheduled_date = ?');
      values.push(input.scheduled_date || null);
    }
    if (input.location !== undefined) {
      fields.push('location = ?');
      values.push(input.location?.trim() || null);
    }
    if (input.max_participants !== undefined) {
      fields.push('max_participants = ?');
      values.push(input.max_participants);
    }
    if (input.evidence_required !== undefined) {
      fields.push('evidence_required = ?');
      values.push(input.evidence_required ? 1 : 0);
    }
    if (input.points_awarded !== undefined) {
      fields.push('points_awarded = ?');
      values.push(input.points_awarded);
    }
    if (input.status !== undefined) {
      fields.push('status = ?');
      values.push(input.status);
    }

    if (fields.length === 0) return getCsrActivityById(id);

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE csr_activities SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    if (result.affectedRows === 0) return null;
    logger.info('CSR activity updated', { id });
    return getCsrActivityById(id);
  } catch (err) {
    logger.error('updateCsrActivity failed', { error: (err as Error).message, id });
    throw err;
  }
}

export async function getCsrStats(): Promise<{
  total: number;
  upcoming: number;
  active: number;
  completed: number;
  total_participants: number;
}> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'upcoming' THEN 1 ELSE 0 END) AS upcoming,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM csr_activities`,
    );
    const [parts] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total_participants FROM employee_csr_participations`,
    );
    return {
      total: Number(rows[0]?.total ?? 0),
      upcoming: Number(rows[0]?.upcoming ?? 0),
      active: Number(rows[0]?.active ?? 0),
      completed: Number(rows[0]?.completed ?? 0),
      total_participants: Number(parts[0]?.total_participants ?? 0),
    };
  } catch (err) {
    logger.error('getCsrStats failed', { error: (err as Error).message });
    throw err;
  }
}
