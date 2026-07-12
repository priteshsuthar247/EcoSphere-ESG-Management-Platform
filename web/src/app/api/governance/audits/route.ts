// src/app/api/governance/audits/route.ts
// GET/POST/PUT audits (admin, ceo)

import { NextRequest } from 'next/server';
import {
  listAudits,
  createAudit,
  updateAudit,
  getAuditStats,
  type AuditStatus,
} from '@/services/auditService';
import { listActiveDepartments } from '@/services/departmentService';
import { getAllUsers } from '@/services/userService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { getAuthUser, hasRole, GOV_AUDIT_ROLES } from '@/lib/requestAuth';
import logger from '@/lib/logger';

const VALID_STATUSES: AuditStatus[] = ['planned', 'in_progress', 'completed', 'under_review'];

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_AUDIT_ROLES)) {
      return errorResponse('Access denied. Admin or CEO required.', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as AuditStatus | 'all') || 'all';
    const includeMeta = searchParams.get('meta') === '1';

    const [items, stats] = await Promise.all([
      listAudits({ status }),
      getAuditStats(),
    ]);

    let departments: Awaited<ReturnType<typeof listActiveDepartments>> = [];
    let users: { id: number; name: string; email: string }[] = [];
    if (includeMeta) {
      const [depts, allUsers] = await Promise.all([
        listActiveDepartments(),
        getAllUsers(),
      ]);
      departments = depts;
      users = allUsers.map((u) => ({ id: u.id, name: u.name, email: u.email }));
    }

    return successResponse({ items, stats, departments, users }, 'Audits retrieved');
  } catch (err) {
    logger.error('GET /api/governance/audits error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_AUDIT_ROLES)) {
      return errorResponse('Access denied. Admin or CEO required.', 403, 'FORBIDDEN');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }
    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid payload', 400, 'VALIDATION_ERROR');
    }

    const {
      title,
      audit_type,
      department_id,
      auditor_user_id,
      external_auditor,
      start_date,
      end_date,
      findings_summary,
      status,
    } = body as Record<string, unknown>;

    if (typeof title !== 'string' || title.trim().length < 2) {
      return errorResponse('Title is required (min 2 characters)', 400, 'VALIDATION_ERROR');
    }
    if (status !== undefined && !VALID_STATUSES.includes(status as AuditStatus)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }

    const created = await createAudit({
      title,
      audit_type: typeof audit_type === 'string' ? audit_type : null,
      department_id:
        department_id === null || department_id === undefined || department_id === ''
          ? null
          : Number(department_id),
      auditor_user_id:
        auditor_user_id === null || auditor_user_id === undefined || auditor_user_id === ''
          ? null
          : Number(auditor_user_id),
      external_auditor: typeof external_auditor === 'string' ? external_auditor : null,
      start_date: typeof start_date === 'string' && start_date ? start_date : null,
      end_date: typeof end_date === 'string' && end_date ? end_date : null,
      findings_summary: typeof findings_summary === 'string' ? findings_summary : null,
      status: (status as AuditStatus) ?? 'planned',
      created_by: user!.id,
    });

    logger.info('Audit created via API', { id: created.id, userId: user!.id });
    return successResponse(created, 'Audit created', 201);
  } catch (err) {
    logger.error('POST /api/governance/audits error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_AUDIT_ROLES)) {
      return errorResponse('Access denied. Admin or CEO required.', 403, 'FORBIDDEN');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }
    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid payload', 400, 'VALIDATION_ERROR');
    }

    const { id, ...rest } = body as Record<string, unknown>;
    const auditId = Number(id);
    if (!Number.isInteger(auditId) || auditId <= 0) {
      return errorResponse('Valid id is required', 400, 'VALIDATION_ERROR');
    }
    if (rest.status !== undefined && !VALID_STATUSES.includes(rest.status as AuditStatus)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }

    const updated = await updateAudit(auditId, {
      title: typeof rest.title === 'string' ? rest.title : undefined,
      audit_type:
        rest.audit_type === null || typeof rest.audit_type === 'string'
          ? (rest.audit_type as string | null)
          : undefined,
      department_id:
        rest.department_id === null || rest.department_id === ''
          ? null
          : rest.department_id !== undefined
            ? Number(rest.department_id)
            : undefined,
      auditor_user_id:
        rest.auditor_user_id === null || rest.auditor_user_id === ''
          ? null
          : rest.auditor_user_id !== undefined
            ? Number(rest.auditor_user_id)
            : undefined,
      external_auditor:
        rest.external_auditor === null || typeof rest.external_auditor === 'string'
          ? (rest.external_auditor as string | null)
          : undefined,
      start_date:
        rest.start_date === null || rest.start_date === ''
          ? null
          : typeof rest.start_date === 'string'
            ? rest.start_date
            : undefined,
      end_date:
        rest.end_date === null || rest.end_date === ''
          ? null
          : typeof rest.end_date === 'string'
            ? rest.end_date
            : undefined,
      findings_summary:
        rest.findings_summary === null || typeof rest.findings_summary === 'string'
          ? (rest.findings_summary as string | null)
          : undefined,
      status: rest.status as AuditStatus | undefined,
    });

    if (!updated) return errorResponse('Audit not found', 404, 'NOT_FOUND');
    logger.info('Audit updated via API', { id: auditId, userId: user!.id });
    return successResponse(updated, 'Audit updated');
  } catch (err) {
    logger.error('PUT /api/governance/audits error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
