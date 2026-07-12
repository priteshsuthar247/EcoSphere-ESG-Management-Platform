// src/app/api/governance/policies/route.ts
// GET/POST/PUT ESG policies

import { NextRequest } from 'next/server';
import {
  listPolicies,
  createPolicy,
  updatePolicy,
  getPolicyStats,
  type EntityStatus,
} from '@/services/policyService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import {
  getAuthUser,
  hasRole,
  GOV_POLICY_READ_ROLES,
  GOV_POLICY_MANAGE_ROLES,
} from '@/lib/requestAuth';
import logger from '@/lib/logger';

const VALID_STATUSES: EntityStatus[] = ['active', 'inactive', 'draft', 'archived'];

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_POLICY_READ_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as EntityStatus | 'all') || 'all';
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();

    const [items, stats] = await Promise.all([
      listPolicies({ status, userId: user!.id, search: search || undefined }),
      getPolicyStats(),
    ]);

    return successResponse(
      {
        items,
        stats,
        viewer: {
          id: user!.id,
          role: user!.role,
          canManage: hasRole(user, GOV_POLICY_MANAGE_ROLES),
        },
      },
      'Policies retrieved',
    );
  } catch (err) {
    logger.error('GET /api/governance/policies error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_POLICY_MANAGE_ROLES)) {
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
      category,
      version,
      content,
      effective_date,
      expiry_date,
      requires_acknowledgement,
      status,
    } = body as Record<string, unknown>;

    if (typeof title !== 'string' || title.trim().length < 2) {
      return errorResponse('Title is required (min 2 characters)', 400, 'VALIDATION_ERROR');
    }
    if (typeof effective_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(effective_date)) {
      return errorResponse('effective_date must be YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }
    if (
      expiry_date !== undefined &&
      expiry_date !== null &&
      expiry_date !== '' &&
      (typeof expiry_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expiry_date))
    ) {
      return errorResponse('expiry_date must be YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }
    if (status !== undefined && !VALID_STATUSES.includes(status as EntityStatus)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }

    const created = await createPolicy({
      title,
      category: typeof category === 'string' ? category : null,
      version: typeof version === 'string' ? version : '1.0',
      content: typeof content === 'string' ? content : null,
      effective_date,
      expiry_date: typeof expiry_date === 'string' && expiry_date ? expiry_date : null,
      requires_acknowledgement:
        requires_acknowledgement === false || requires_acknowledgement === 0 ? false : true,
      status: (status as EntityStatus) ?? 'active',
      created_by: user!.id,
      approved_by: user!.id,
    });

    logger.info('Policy created via API', { id: created.id, userId: user!.id });
    return successResponse(created, 'Policy created', 201);
  } catch (err) {
    logger.error('POST /api/governance/policies error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_POLICY_MANAGE_ROLES)) {
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
    const policyId = Number(id);
    if (!Number.isInteger(policyId) || policyId <= 0) {
      return errorResponse('Valid id is required', 400, 'VALIDATION_ERROR');
    }
    if (rest.status !== undefined && !VALID_STATUSES.includes(rest.status as EntityStatus)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }
    if (
      rest.effective_date !== undefined &&
      (typeof rest.effective_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rest.effective_date))
    ) {
      return errorResponse('effective_date must be YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }

    const updated = await updatePolicy(policyId, {
      title: typeof rest.title === 'string' ? rest.title : undefined,
      category:
        rest.category === null || typeof rest.category === 'string'
          ? (rest.category as string | null)
          : undefined,
      version: typeof rest.version === 'string' ? rest.version : undefined,
      content:
        rest.content === null || typeof rest.content === 'string'
          ? (rest.content as string | null)
          : undefined,
      effective_date: typeof rest.effective_date === 'string' ? rest.effective_date : undefined,
      expiry_date:
        rest.expiry_date === null || rest.expiry_date === ''
          ? null
          : typeof rest.expiry_date === 'string'
            ? rest.expiry_date
            : undefined,
      requires_acknowledgement:
        rest.requires_acknowledgement === undefined
          ? undefined
          : rest.requires_acknowledgement === true ||
            rest.requires_acknowledgement === 1 ||
            rest.requires_acknowledgement === '1',
      status: rest.status as EntityStatus | undefined,
    });

    if (!updated) return errorResponse('Policy not found', 404, 'NOT_FOUND');
    logger.info('Policy updated via API', { id: policyId, userId: user!.id });
    return successResponse(updated, 'Policy updated');
  } catch (err) {
    logger.error('PUT /api/governance/policies error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
