// src/app/api/social/participations/route.ts
// GET  — list participations (scoped by role)
// POST — join activity | submit proof
// PUT  — approve / reject participation

import { NextRequest } from 'next/server';
import {
  listParticipations,
  joinCsrActivity,
  submitParticipation,
  reviewParticipation,
  getParticipationStats,
  type ApprovalStatus,
} from '@/services/csrParticipationService';
import { listCsrActivities } from '@/services/csrActivityService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import {
  getAuthUser,
  hasRole,
  SOCIAL_READ_ROLES,
  SOCIAL_APPROVE_ROLES,
} from '@/lib/requestAuth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, SOCIAL_READ_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as ApprovalStatus | 'all') || 'all';
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const includeMeta = searchParams.get('meta') === '1';
    const activityIdParam = searchParams.get('activity_id');

    const canApprove = hasRole(user, SOCIAL_APPROVE_ROLES);
    const isEmployeeOnly = user!.role === 'employee';

    const listOpts: {
      userId?: number;
      departmentId?: number | null;
      approvalStatus?: ApprovalStatus | 'all';
      activityId?: number;
      search?: string;
    } = {
      approvalStatus: status,
      search: search || undefined,
    };

    if (isEmployeeOnly) {
      listOpts.userId = user!.id;
    } else if (user!.role === 'departmental_head') {
      listOpts.departmentId = user!.department_id;
    }

    if (activityIdParam) {
      const aid = Number(activityIdParam);
      if (Number.isInteger(aid) && aid > 0) listOpts.activityId = aid;
    }

    const [items, stats] = await Promise.all([
      listParticipations(listOpts),
      getParticipationStats(
        isEmployeeOnly
          ? { userId: user!.id }
          : user!.role === 'departmental_head'
            ? { departmentId: user!.department_id }
            : undefined,
      ),
    ]);

    let activities: Awaited<ReturnType<typeof listCsrActivities>> = [];
    if (includeMeta) {
      activities = await listCsrActivities({ status: 'all' });
    }

    return successResponse(
      {
        items,
        stats,
        activities,
        viewer: {
          id: user!.id,
          role: user!.role,
          canApprove,
        },
      },
      'Participations retrieved',
    );
  } catch (err) {
    logger.error('GET /api/social/participations error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, SOCIAL_READ_ROLES)) {
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

    const payload = body as Record<string, unknown>;
    const action = typeof payload.action === 'string' ? payload.action : 'join';

    if (action === 'join') {
      const activityId = Number(payload.activity_id ?? payload.csr_activity_id);
      if (!Number.isInteger(activityId) || activityId <= 0) {
        return errorResponse('Valid activity_id is required', 400, 'VALIDATION_ERROR');
      }

      try {
        const created = await joinCsrActivity({
          userId: user!.id,
          activityId,
        });
        logger.info('Joined CSR via API', {
          participationId: created.id,
          userId: user!.id,
          activityId,
        });
        return successResponse(created, 'Joined CSR activity', 201);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === 'ACTIVITY_NOT_FOUND') {
          return errorResponse('Activity not found', 404, 'NOT_FOUND');
        }
        if (msg === 'ACTIVITY_NOT_JOINABLE') {
          return errorResponse('Activity is not open for joining', 400, 'NOT_JOINABLE');
        }
        if (msg === 'ACTIVITY_FULL') {
          return errorResponse('Activity has reached max participants', 400, 'ACTIVITY_FULL');
        }
        if (msg === 'ALREADY_JOINED') {
          return errorResponse('You have already joined this activity', 409, 'ALREADY_JOINED');
        }
        throw err;
      }
    }

    if (action === 'submit') {
      const participationId = Number(payload.participation_id ?? payload.id);
      if (!Number.isInteger(participationId) || participationId <= 0) {
        return errorResponse('Valid participation_id is required', 400, 'VALIDATION_ERROR');
      }

      try {
        const updated = await submitParticipation({
          participationId,
          userId: user!.id,
          completion_date:
            typeof payload.completion_date === 'string' ? payload.completion_date : null,
          proof_url: typeof payload.proof_url === 'string' ? payload.proof_url : null,
          proof_file_name:
            typeof payload.proof_file_name === 'string' ? payload.proof_file_name : null,
        });
        return successResponse(updated, 'Participation submitted for review');
      } catch (err) {
        const msg = (err as Error).message;
        if (msg === 'PARTICIPATION_NOT_FOUND') {
          return errorResponse('Participation not found', 404, 'NOT_FOUND');
        }
        if (msg === 'FORBIDDEN') {
          return errorResponse('You can only submit your own participation', 403, 'FORBIDDEN');
        }
        if (msg === 'ALREADY_APPROVED') {
          return errorResponse('Participation already approved', 400, 'ALREADY_APPROVED');
        }
        throw err;
      }
    }

    return errorResponse('Invalid action. Use join or submit.', 400, 'VALIDATION_ERROR');
  } catch (err) {
    logger.error('POST /api/social/participations error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, SOCIAL_APPROVE_ROLES)) {
      return errorResponse('Access denied. Approver role required.', 403, 'FORBIDDEN');
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
      id,
      participation_id,
      decision,
      rejection_reason,
      force_without_proof,
    } = body as Record<string, unknown>;

    const participationId = Number(participation_id ?? id);
    if (!Number.isInteger(participationId) || participationId <= 0) {
      return errorResponse('Valid participation id is required', 400, 'VALIDATION_ERROR');
    }
    if (decision !== 'approved' && decision !== 'rejected') {
      return errorResponse('decision must be approved or rejected', 400, 'VALIDATION_ERROR');
    }

    // Departmental heads can only review their department's employees
    if (user!.role === 'departmental_head') {
      const rows = await listParticipations({ departmentId: user!.department_id });
      const target = rows.find((r) => r.id === participationId);
      if (!target) {
        return errorResponse('Participation not found in your department', 404, 'NOT_FOUND');
      }
    }

    try {
      const updated = await reviewParticipation({
        participationId,
        reviewerId: user!.id,
        decision,
        rejection_reason: typeof rejection_reason === 'string' ? rejection_reason : null,
        forceWithoutProof:
          force_without_proof === true &&
          (user!.role === 'admin' || user!.role === 'ceo'),
      });
      logger.info('CSR participation reviewed', {
        participationId,
        decision,
        reviewerId: user!.id,
      });
      return successResponse(updated, `Participation ${decision}`);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'PARTICIPATION_NOT_FOUND') {
        return errorResponse('Participation not found', 404, 'NOT_FOUND');
      }
      if (msg === 'ALREADY_APPROVED') {
        return errorResponse('Participation already approved', 400, 'ALREADY_APPROVED');
      }
      if (msg === 'PROOF_REQUIRED') {
        return errorResponse(
          'Proof is required before approval (activity evidence rule or global CSR evidence setting).',
          400,
          'PROOF_REQUIRED',
        );
      }
      throw err;
    }
  } catch (err) {
    logger.error('PUT /api/social/participations error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
