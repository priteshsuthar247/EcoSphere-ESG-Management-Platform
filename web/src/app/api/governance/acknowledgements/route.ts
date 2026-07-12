// src/app/api/governance/acknowledgements/route.ts
// GET list/coverage | POST acknowledge policy

import { NextRequest } from 'next/server';
import {
  listAcknowledgements,
  acknowledgePolicy,
  getAcknowledgementStats,
  getCoverageMatrix,
  listPendingForUser,
} from '@/services/policyAcknowledgementService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import {
  getAuthUser,
  hasRole,
  GOV_POLICY_READ_ROLES,
  GOV_ACK_READ_ROLES,
} from '@/lib/requestAuth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_POLICY_READ_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const mine = searchParams.get('mine') === '1';
    const canViewAll = hasRole(user, GOV_ACK_READ_ROLES);

    // Best-effort policy acknowledgement reminders (in-app + email per settings)
    try {
      const { sendPolicyAcknowledgementReminders } = await import(
        '@/services/notificationService'
      );
      // Fire-and-forget for managers viewing coverage; also nudge current user path
      void sendPolicyAcknowledgementReminders();
    } catch {
      // non-fatal
    }

    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();

    // Employees (or mine=1): return own acks + pending
    if (mine || !canViewAll) {
      const [items, pending] = await Promise.all([
        listAcknowledgements({ userId: user!.id, search: search || undefined }),
        listPendingForUser(user!.id),
      ]);
      return successResponse(
        {
          items,
          pending,
          stats: null,
          coverage: [],
          viewer: { id: user!.id, role: user!.role, canViewAll: false },
        },
        'Your acknowledgements retrieved',
      );
    }

    const deptFilter =
      user!.role === 'departmental_head' ? user!.department_id : undefined;

    const [items, stats, coverage] = await Promise.all([
      listAcknowledgements({ departmentId: deptFilter, search: search || undefined }),
      getAcknowledgementStats({ departmentId: deptFilter }),
      getCoverageMatrix(),
    ]);

    return successResponse(
      {
        items,
        pending: [],
        stats,
        coverage,
        viewer: { id: user!.id, role: user!.role, canViewAll: true },
      },
      'Acknowledgements retrieved',
    );
  } catch (err) {
    logger.error('GET /api/governance/acknowledgements error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, GOV_POLICY_READ_ROLES)) {
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

    const { policy_id } = body as Record<string, unknown>;
    const policyId = Number(policy_id);
    if (!Number.isInteger(policyId) || policyId <= 0) {
      return errorResponse('Valid policy_id is required', 400, 'VALIDATION_ERROR');
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const ua = request.headers.get('user-agent');

    try {
      const created = await acknowledgePolicy({
        userId: user!.id,
        policyId,
        ipAddress: ip,
        userAgent: ua,
      });
      logger.info('Policy acknowledged via API', {
        userId: user!.id,
        policyId,
      });
      return successResponse(created, 'Policy acknowledged', 201);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'POLICY_NOT_FOUND') {
        return errorResponse('Policy not found', 404, 'NOT_FOUND');
      }
      if (msg === 'POLICY_NOT_ACTIVE') {
        return errorResponse('Only active policies can be acknowledged', 400, 'NOT_ACTIVE');
      }
      if (msg === 'ACK_NOT_REQUIRED') {
        return errorResponse('This policy does not require acknowledgement', 400, 'NOT_REQUIRED');
      }
      if (msg === 'ALREADY_ACKNOWLEDGED') {
        return errorResponse('Already acknowledged this policy version', 409, 'ALREADY_ACKNOWLEDGED');
      }
      throw err;
    }
  } catch (err) {
    logger.error('POST /api/governance/acknowledgements error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
