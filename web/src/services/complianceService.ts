// src/services/complianceService.ts
// DB access for compliance issues.

import pool from '@/config/db';
import logger from '@/lib/logger';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ComplianceStatus = 'open' | 'in_progress' | 'resolved' | 'overdue';

export interface ComplianceIssue extends RowDataPacket {
  id: number;
  audit_id: number | null;
  audit_title: string | null;
  title: string;
  description: string;
  severity: Severity;
  department_id: number | null;
  department_name: string | null;
  owner_user_id: number;
  owner_name: string;
  due_date: string;
  status: ComplianceStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  flagged_overdue: number;
  created_at: string;
  updated_at: string;
}

export interface CreateComplianceInput {
  audit_id?: number | null;
  title: string;
  description: string;
  severity: Severity;
  department_id?: number | null;
  owner_user_id: number;
  due_date: string;
  status?: ComplianceStatus;
}

export interface UpdateComplianceInput {
  audit_id?: number | null;
  title?: string;
  description?: string;
  severity?: Severity;
  department_id?: number | null;
  owner_user_id?: number;
  due_date?: string;
  status?: ComplianceStatus;
  resolution_notes?: string | null;
}

function normalize(row: ComplianceIssue): ComplianceIssue {
  return {
    ...row,
    flagged_overdue: Number(row.flagged_overdue),
  };
}

/**
 * Flag open/in_progress issues past due_date as overdue.
 */
export async function syncOverdueFlags(): Promise<void> {
  try {
    await pool.execute(
      `UPDATE compliance_issues
       SET status = 'overdue', flagged_overdue = 1
       WHERE due_date < CURDATE()
         AND status IN ('open', 'in_progress')`,
    );
    // Feed notification system for newly overdue items
    const { notifyNewlyOverdueCompliance } = await import(
      '@/services/notificationService'
    );
    await notifyNewlyOverdueCompliance();
  } catch (err) {
    logger.warn('syncOverdueFlags failed', { error: (err as Error).message });
  }
}

export async function listComplianceIssues(options?: {
  status?: ComplianceStatus | 'all';
  departmentId?: number | null;
  ownerUserId?: number;
  auditId?: number;
  search?: string;
}): Promise<ComplianceIssue[]> {
  try {
    await syncOverdueFlags();

    const clauses: string[] = [];
    const params: Array<string | number | boolean | null> = [];

    if (options?.status && options.status !== 'all') {
      clauses.push('ci.status = ?');
      params.push(options.status);
    }
    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('ci.department_id = ?');
      params.push(options.departmentId);
    }
    if (options?.ownerUserId !== undefined) {
      clauses.push('ci.owner_user_id = ?');
      params.push(options.ownerUserId);
    }
    if (options?.auditId !== undefined) {
      clauses.push('ci.audit_id = ?');
      params.push(options.auditId);
    }
    if (options?.search?.trim()) {
      const q = `%${options.search.trim().replace(/[%_]/g, '\\$&')}%`;
      clauses.push(
        `(ci.title LIKE ? OR ci.description LIKE ? OR ci.resolution_notes LIKE ?
          OR a.title LIKE ? OR d.name LIKE ? OR o.name LIKE ?
          OR CAST(ci.id AS CHAR) LIKE ?)`,
      );
      params.push(q, q, q, q, q, q, q);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute<ComplianceIssue[]>(
      `SELECT ci.id, ci.audit_id, a.title AS audit_title, ci.title, ci.description,
              ci.severity, ci.department_id, d.name AS department_name,
              ci.owner_user_id, o.name AS owner_name, ci.due_date, ci.status,
              ci.resolution_notes, ci.resolved_at, ci.flagged_overdue,
              ci.created_at, ci.updated_at
       FROM compliance_issues ci
       LEFT JOIN audits a ON a.id = ci.audit_id
       LEFT JOIN departments d ON d.id = ci.department_id
       LEFT JOIN users o ON o.id = ci.owner_user_id
       ${where}
       ORDER BY
         CASE ci.severity
           WHEN 'critical' THEN 0
           WHEN 'high' THEN 1
           WHEN 'medium' THEN 2
           ELSE 3
         END,
         CASE ci.status
           WHEN 'overdue' THEN 0
           WHEN 'open' THEN 1
           WHEN 'in_progress' THEN 2
           ELSE 3
         END,
         ci.due_date ASC`,
      params,
    );
    return rows.map(normalize);
  } catch (err) {
    logger.error('listComplianceIssues failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getComplianceIssueById(id: number): Promise<ComplianceIssue | null> {
  try {
    const rows = await listComplianceIssues();
    return rows.find((r) => r.id === id) ?? null;
  } catch (err) {
    logger.error('getComplianceIssueById failed', { error: (err as Error).message, id });
    throw err;
  }
}

async function bumpAuditIssueCount(auditId: number | null | undefined): Promise<void> {
  if (!auditId) return;
  await pool.execute(
    `UPDATE audits a
     SET num_issues = (
       SELECT COUNT(*) FROM compliance_issues ci WHERE ci.audit_id = a.id
     )
     WHERE a.id = ?`,
    [auditId],
  );
}

export async function createComplianceIssue(
  input: CreateComplianceInput,
): Promise<ComplianceIssue> {
  try {
    const due = input.due_date;
    let status: ComplianceStatus = input.status ?? 'open';
    let flagged = 0;
    if (due < new Date().toISOString().slice(0, 10) && status !== 'resolved') {
      status = 'overdue';
      flagged = 1;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO compliance_issues
         (audit_id, title, description, severity, department_id, owner_user_id,
          due_date, status, flagged_overdue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.audit_id ?? null,
        input.title.trim(),
        input.description.trim(),
        input.severity,
        input.department_id ?? null,
        input.owner_user_id,
        due,
        status,
        flagged,
      ],
    );

    await bumpAuditIssueCount(input.audit_id);

    const created = await getComplianceIssueById(result.insertId);
    if (!created) throw new Error('COMPLIANCE_CREATE_FAILED');
    logger.info('Compliance issue created', { id: created.id, severity: created.severity });

    // Notify assigned owner (in-app + email if enabled)
    try {
      const { notifyUser } = await import('@/services/notificationService');
      await notifyUser({
        userId: input.owner_user_id,
        type: 'new_compliance_issue',
        title: flagged ? `Overdue: ${created.title}` : `New compliance issue: ${created.title}`,
        message: `You are the owner of compliance issue "${created.title}" (severity: ${created.severity}, due ${due}).`,
        actionUrl: '/dashboard/governance/compliance',
        relatedEntityType: 'compliance_issue',
        relatedEntityId: created.id,
        emailSubject: `Compliance issue assigned: ${created.title}`,
      });
    } catch {
      // non-fatal
    }

    return created;
  } catch (err) {
    logger.error('createComplianceIssue failed', { error: (err as Error).message });
    throw err;
  }
}

export async function updateComplianceIssue(
  id: number,
  input: UpdateComplianceInput,
): Promise<ComplianceIssue | null> {
  try {
    const existing = await getComplianceIssueById(id);
    if (!existing) return null;

    const next = {
      audit_id: input.audit_id !== undefined ? input.audit_id : existing.audit_id,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      description:
        input.description !== undefined ? input.description.trim() : existing.description,
      severity: input.severity !== undefined ? input.severity : existing.severity,
      department_id:
        input.department_id !== undefined ? input.department_id : existing.department_id,
      owner_user_id:
        input.owner_user_id !== undefined ? input.owner_user_id : existing.owner_user_id,
      due_date:
        input.due_date !== undefined ? input.due_date : String(existing.due_date).slice(0, 10),
      status: input.status !== undefined ? input.status : existing.status,
      resolution_notes:
        input.resolution_notes !== undefined
          ? input.resolution_notes?.trim() || null
          : existing.resolution_notes,
    };

    let resolvedAt: string | null =
      existing.resolved_at === null ? null : String(existing.resolved_at);
    let flagged = Number(existing.flagged_overdue);
    let status: ComplianceStatus = next.status;

    if (status === 'resolved') {
      resolvedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      flagged = 0;
    } else if (next.due_date < new Date().toISOString().slice(0, 10)) {
      status = 'overdue';
      flagged = 1;
      resolvedAt = null;
    } else {
      resolvedAt = null;
      if (status !== 'overdue') flagged = 0;
    }
    next.status = status;

    await pool.execute(
      `UPDATE compliance_issues
       SET audit_id = ?, title = ?, description = ?, severity = ?,
           department_id = ?, owner_user_id = ?, due_date = ?, status = ?,
           resolution_notes = ?, resolved_at = ?, flagged_overdue = ?
       WHERE id = ?`,
      [
        next.audit_id,
        next.title,
        next.description,
        next.severity,
        next.department_id,
        next.owner_user_id,
        next.due_date,
        status,
        next.resolution_notes,
        resolvedAt,
        flagged,
        id,
      ],
    );

    if (existing.audit_id !== next.audit_id) {
      await bumpAuditIssueCount(existing.audit_id);
      await bumpAuditIssueCount(next.audit_id);
    } else {
      await bumpAuditIssueCount(next.audit_id);
    }

    logger.info('Compliance issue updated', { id, status: next.status });
    return getComplianceIssueById(id);
  } catch (err) {
    logger.error('updateComplianceIssue failed', { error: (err as Error).message, id });
    throw err;
  }
}

export async function getComplianceStats(options?: {
  departmentId?: number | null;
}): Promise<{
  total: number;
  open: number;
  in_progress: number;
  overdue: number;
  resolved: number;
  critical: number;
}> {
  try {
    await syncOverdueFlags();
    const clauses: string[] = [];
    const params: Array<string | number | boolean | null> = [];
    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('department_id = ?');
      params.push(options.departmentId);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
         SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) AS overdue,
         SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
         SUM(CASE WHEN severity = 'critical' AND status <> 'resolved' THEN 1 ELSE 0 END) AS critical
       FROM compliance_issues
       ${where}`,
      params,
    );

    return {
      total: Number(rows[0]?.total ?? 0),
      open: Number(rows[0]?.open_count ?? 0),
      in_progress: Number(rows[0]?.in_progress ?? 0),
      overdue: Number(rows[0]?.overdue ?? 0),
      resolved: Number(rows[0]?.resolved ?? 0),
      critical: Number(rows[0]?.critical ?? 0),
    };
  } catch (err) {
    logger.error('getComplianceStats failed', { error: (err as Error).message });
    throw err;
  }
}
