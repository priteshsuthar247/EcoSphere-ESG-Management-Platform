// src/app/api/governance/compliance/route.ts
// GET/POST/PUT compliance issues

import { NextRequest } from 'next/server';
import {
  listComplianceIssues,
  createComplianceIssue,
  updateComplianceIssue,
  getComplianceStats,
  type Severity,
  type ComplianceStatus,
} from '@/services/complianceService';
import { listAudits } from '@/services/auditService';
import { listActiveDepartments } from '@/services/departmentService';
import { getAllUsers } from '@/services/userService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { getAuthUser, hasRole, GOV_COMPLIANCE_ROLES } from '@/lib/requestAuth';
import logger from '@/lib/logger';

const VALID_SEVERITY: Severity[] = ['low', 'medium', 'high', 'critical'];
const VALID_STATUS: ComplianceStatus[] = ['open', 'in_progress', 'resolved', 'overdue'];

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_COMPLIANCE_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as ComplianceStatus | 'all') || 'all';
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const includeMeta = searchParams.get('meta') === '1';

    const deptFilter =
      user!.role === 'departmental_head' ? user!.department_id : undefined;

    const [items, stats] = await Promise.all([
      listComplianceIssues({ status, departmentId: deptFilter, search: search || undefined }),
      getComplianceStats({ departmentId: deptFilter }),
    ]);

    let departments: Awaited<ReturnType<typeof listActiveDepartments>> = [];
    let users: { id: number; name: string; email: string }[] = [];
    let audits: { id: number; title: string; status: string }[] = [];

    if (includeMeta) {
      const [depts, allUsers, auditRows] = await Promise.all([
        listActiveDepartments(),
        getAllUsers(),
        listAudits({ status: 'all' }),
      ]);
      departments = depts;
      users = allUsers.map((u) => ({ id: u.id, name: u.name, email: u.email }));
      audits = auditRows.map((a) => ({ id: a.id, title: a.title, status: a.status }));
    }

    return successResponse(
      {
        items,
        stats,
        departments,
        users,
        audits,
        viewer: { id: user!.id, role: user!.role },
      },
      'Compliance issues retrieved',
    );
  } catch (err) {
    logger.error('GET /api/governance/compliance error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_COMPLIANCE_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
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
      audit_id,
      title,
      description,
      severity,
      department_id,
      owner_user_id,
      due_date,
      status,
    } = body as Record<string, unknown>;

    if (typeof title !== 'string' || title.trim().length < 2) {
      return errorResponse('Title is required (min 2 characters)', 400, 'VALIDATION_ERROR');
    }
    if (typeof description !== 'string' || description.trim().length < 2) {
      return errorResponse('Description is required', 400, 'VALIDATION_ERROR');
    }
    if (!VALID_SEVERITY.includes(severity as Severity)) {
      return errorResponse('Invalid severity', 400, 'VALIDATION_ERROR');
    }
    if (typeof due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return errorResponse('due_date must be YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }

    const ownerId = Number(owner_user_id);
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return errorResponse('owner_user_id is required', 400, 'VALIDATION_ERROR');
    }

    let resolvedDeptId: number | null =
      department_id === null || department_id === undefined || department_id === ''
        ? null
        : Number(department_id);

    if (user!.role === 'departmental_head') {
      if (!user!.department_id) {
        return errorResponse(
          'Your account has no department assigned.',
          400,
          'NO_DEPARTMENT',
        );
      }
      resolvedDeptId = user!.department_id;
    }

    if (status !== undefined && !VALID_STATUS.includes(status as ComplianceStatus)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }

    const created = await createComplianceIssue({
      audit_id:
        audit_id === null || audit_id === undefined || audit_id === ''
          ? null
          : Number(audit_id),
      title,
      description,
      severity: severity as Severity,
      department_id: resolvedDeptId,
      owner_user_id: ownerId,
      due_date,
      status: (status as ComplianceStatus) ?? 'open',
    });

    logger.info('Compliance issue created via API', {
      id: created.id,
      userId: user!.id,
    });
    return successResponse(created, 'Compliance issue created', 201);
  } catch (err) {
    logger.error('POST /api/governance/compliance error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_COMPLIANCE_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
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
    const issueId = Number(id);
    if (!Number.isInteger(issueId) || issueId <= 0) {
      return errorResponse('Valid id is required', 400, 'VALIDATION_ERROR');
    }

    if (user!.role === 'departmental_head') {
      const scoped = await listComplianceIssues({ departmentId: user!.department_id });
      if (!scoped.find((i) => i.id === issueId)) {
        return errorResponse('Issue not found in your department', 404, 'NOT_FOUND');
      }
      if (rest.department_id !== undefined) {
        rest.department_id = user!.department_id;
      }
    }

    if (rest.severity !== undefined && !VALID_SEVERITY.includes(rest.severity as Severity)) {
      return errorResponse('Invalid severity', 400, 'VALIDATION_ERROR');
    }
    if (rest.status !== undefined && !VALID_STATUS.includes(rest.status as ComplianceStatus)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }
    if (
      rest.due_date !== undefined &&
      (typeof rest.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rest.due_date))
    ) {
      return errorResponse('due_date must be YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }

    const updated = await updateComplianceIssue(issueId, {
      audit_id:
        rest.audit_id === null || rest.audit_id === ''
          ? null
          : rest.audit_id !== undefined
            ? Number(rest.audit_id)
            : undefined,
      title: typeof rest.title === 'string' ? rest.title : undefined,
      description: typeof rest.description === 'string' ? rest.description : undefined,
      severity: rest.severity as Severity | undefined,
      department_id:
        rest.department_id === null || rest.department_id === ''
          ? null
          : rest.department_id !== undefined
            ? Number(rest.department_id)
            : undefined,
      owner_user_id:
        rest.owner_user_id !== undefined ? Number(rest.owner_user_id) : undefined,
      due_date: typeof rest.due_date === 'string' ? rest.due_date : undefined,
      status: rest.status as ComplianceStatus | undefined,
      resolution_notes:
        rest.resolution_notes === null || typeof rest.resolution_notes === 'string'
          ? (rest.resolution_notes as string | null)
          : undefined,
    });

    if (!updated) return errorResponse('Compliance issue not found', 404, 'NOT_FOUND');
    logger.info('Compliance issue updated via API', { id: issueId, userId: user!.id });
    return successResponse(updated, 'Compliance issue updated');
  } catch (err) {
    logger.error('PUT /api/governance/compliance error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
