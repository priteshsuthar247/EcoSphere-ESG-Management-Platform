// src/services/auditService.ts
// DB access for governance audits.

import pool from '@/config/db';
import logger from '@/lib/logger';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'under_review';

export interface Audit extends RowDataPacket {
  id: number;
  title: string;
  audit_type: string | null;
  department_id: number | null;
  department_name: string | null;
  auditor_user_id: number | null;
  auditor_name: string | null;
  external_auditor: string | null;
  start_date: string | null;
  end_date: string | null;
  findings_summary: string | null;
  num_issues: number;
  status: AuditStatus;
  report_attachment_id: number | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  open_issues: number;
}

export interface CreateAuditInput {
  title: string;
  audit_type?: string | null;
  department_id?: number | null;
  auditor_user_id?: number | null;
  external_auditor?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  findings_summary?: string | null;
  status?: AuditStatus;
  created_by?: number | null;
}

export interface UpdateAuditInput {
  title?: string;
  audit_type?: string | null;
  department_id?: number | null;
  auditor_user_id?: number | null;
  external_auditor?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  findings_summary?: string | null;
  status?: AuditStatus;
}

function normalize(row: Audit): Audit {
  return {
    ...row,
    num_issues: Number(row.num_issues ?? 0),
    open_issues: Number(row.open_issues ?? 0),
  };
}

export async function listAudits(options?: {
  status?: AuditStatus | 'all';
  departmentId?: number | null;
}): Promise<Audit[]> {
  try {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (options?.status && options.status !== 'all') {
      clauses.push('a.status = ?');
      params.push(options.status);
    }
    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('a.department_id = ?');
      params.push(options.departmentId);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute<Audit[]>(
      `SELECT a.id, a.title, a.audit_type, a.department_id, d.name AS department_name,
              a.auditor_user_id, au.name AS auditor_name, a.external_auditor,
              a.start_date, a.end_date, a.findings_summary, a.num_issues, a.status,
              a.report_attachment_id, a.created_by, c.name AS created_by_name,
              a.created_at, a.updated_at,
              SUM(CASE WHEN ci.status IN ('open', 'in_progress', 'overdue') THEN 1 ELSE 0 END) AS open_issues
       FROM audits a
       LEFT JOIN departments d ON d.id = a.department_id
       LEFT JOIN users au ON au.id = a.auditor_user_id
       LEFT JOIN users c ON c.id = a.created_by
       LEFT JOIN compliance_issues ci ON ci.audit_id = a.id
       ${where}
       GROUP BY a.id
       ORDER BY
         CASE a.status
           WHEN 'in_progress' THEN 0
           WHEN 'planned' THEN 1
           WHEN 'under_review' THEN 2
           ELSE 3
         END,
         a.start_date IS NULL,
         a.start_date DESC`,
      params,
    );
    return rows.map(normalize);
  } catch (err) {
    logger.error('listAudits failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getAuditById(id: number): Promise<Audit | null> {
  try {
    const rows = await listAudits();
    return rows.find((r) => r.id === id) ?? null;
  } catch (err) {
    logger.error('getAuditById failed', { error: (err as Error).message, id });
    throw err;
  }
}

export async function createAudit(input: CreateAuditInput): Promise<Audit> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO audits
         (title, audit_type, department_id, auditor_user_id, external_auditor,
          start_date, end_date, findings_summary, num_issues, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        input.title.trim(),
        input.audit_type?.trim() || null,
        input.department_id ?? null,
        input.auditor_user_id ?? null,
        input.external_auditor?.trim() || null,
        input.start_date || null,
        input.end_date || null,
        input.findings_summary?.trim() || null,
        input.status ?? 'planned',
        input.created_by ?? null,
      ],
    );

    const created = await getAuditById(result.insertId);
    if (!created) throw new Error('AUDIT_CREATE_FAILED');
    logger.info('Audit created', { id: created.id, title: created.title });
    return created;
  } catch (err) {
    logger.error('createAudit failed', { error: (err as Error).message });
    throw err;
  }
}

export async function updateAudit(
  id: number,
  input: UpdateAuditInput,
): Promise<Audit | null> {
  try {
    const fields: string[] = [];
    const values: unknown[] = [];

    const map: Array<[keyof UpdateAuditInput, string, boolean]> = [
      ['title', 'title', true],
      ['audit_type', 'audit_type', true],
      ['department_id', 'department_id', false],
      ['auditor_user_id', 'auditor_user_id', false],
      ['external_auditor', 'external_auditor', true],
      ['start_date', 'start_date', false],
      ['end_date', 'end_date', false],
      ['findings_summary', 'findings_summary', true],
      ['status', 'status', false],
    ];

    for (const [key, column, trim] of map) {
      if (input[key] !== undefined) {
        fields.push(`${column} = ?`);
        const val = input[key];
        if (trim && typeof val === 'string') {
          values.push(val.trim() || null);
        } else {
          values.push(val === '' ? null : val);
        }
      }
    }

    if (fields.length === 0) return getAuditById(id);

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE audits SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    if (result.affectedRows === 0) return null;

    // Keep num_issues in sync with linked compliance issues
    await pool.execute(
      `UPDATE audits a
       SET num_issues = (
         SELECT COUNT(*) FROM compliance_issues ci WHERE ci.audit_id = a.id
       )
       WHERE a.id = ?`,
      [id],
    );

    logger.info('Audit updated', { id });
    return getAuditById(id);
  } catch (err) {
    logger.error('updateAudit failed', { error: (err as Error).message, id });
    throw err;
  }
}

export async function getAuditStats(): Promise<{
  total: number;
  planned: number;
  in_progress: number;
  completed: number;
  under_review: number;
  total_open_issues: number;
}> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) AS planned,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) AS under_review
       FROM audits`,
    );
    const [issues] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total_open_issues
       FROM compliance_issues
       WHERE status IN ('open', 'in_progress', 'overdue')`,
    );
    return {
      total: Number(rows[0]?.total ?? 0),
      planned: Number(rows[0]?.planned ?? 0),
      in_progress: Number(rows[0]?.in_progress ?? 0),
      completed: Number(rows[0]?.completed ?? 0),
      under_review: Number(rows[0]?.under_review ?? 0),
      total_open_issues: Number(issues[0]?.total_open_issues ?? 0),
    };
  } catch (err) {
    logger.error('getAuditStats failed', { error: (err as Error).message });
    throw err;
  }
}
