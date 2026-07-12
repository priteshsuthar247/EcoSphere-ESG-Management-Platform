// src/app/api/social/csr-activities/route.ts
// GET  — list CSR activities + stats (+ optional meta)
// POST — create CSR activity (managers)
// PUT  — update CSR activity (managers)

import { NextRequest } from 'next/server';
import {
  listCsrActivities,
  createCsrActivity,
  updateCsrActivity,
  getCsrStats,
} from '@/services/csrActivityService';
import { listCategories } from '@/services/categoryService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import {
  getAuthUser,
  hasRole,
  SOCIAL_READ_ROLES,
  SOCIAL_MANAGE_ROLES,
} from '@/lib/requestAuth';
import logger from '@/lib/logger';

const VALID_STATUSES = ['upcoming', 'active', 'completed', 'cancelled', 'archived'];

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, SOCIAL_READ_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const includeMeta = searchParams.get('meta') === '1';
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();

    const [items, stats] = await Promise.all([
      listCsrActivities({ status, search: search || undefined }),
      getCsrStats(),
    ]);

    let categories: Awaited<ReturnType<typeof listCategories>> = [];
    if (includeMeta) {
      categories = await listCategories({ type: 'csr_activity', status: 'active' });
    }

    return successResponse(
      {
        items,
        stats,
        categories,
        viewer: {
          id: user!.id,
          role: user!.role,
          canManage: hasRole(user, SOCIAL_MANAGE_ROLES),
        },
      },
      'CSR activities retrieved',
    );
  } catch (err) {
    logger.error('GET /api/social/csr-activities error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, SOCIAL_MANAGE_ROLES)) {
      return errorResponse('Access denied. Manager role required.', 403, 'FORBIDDEN');
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
      description,
      category_id,
      scheduled_date,
      location,
      max_participants,
      evidence_required,
      points_awarded,
      status,
    } = body as Record<string, unknown>;

    if (typeof title !== 'string' || title.trim().length < 2) {
      return errorResponse('Title is required (min 2 characters)', 400, 'VALIDATION_ERROR');
    }
    if (
      scheduled_date !== undefined &&
      scheduled_date !== null &&
      scheduled_date !== '' &&
      (typeof scheduled_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date))
    ) {
      return errorResponse('scheduled_date must be YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }
    if (status !== undefined && !VALID_STATUSES.includes(status as string)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }

    let maxParts: number | null = null;
    if (max_participants !== undefined && max_participants !== null && max_participants !== '') {
      maxParts = Number(max_participants);
      if (!Number.isInteger(maxParts) || maxParts < 1) {
        return errorResponse('max_participants must be a positive integer', 400, 'VALIDATION_ERROR');
      }
    }

    let points = 50;
    if (points_awarded !== undefined && points_awarded !== null && points_awarded !== '') {
      points = Number(points_awarded);
      if (!Number.isInteger(points) || points < 0) {
        return errorResponse('points_awarded must be a non-negative integer', 400, 'VALIDATION_ERROR');
      }
    }

    const created = await createCsrActivity({
      title,
      description: typeof description === 'string' ? description : null,
      category_id:
        category_id === null || category_id === undefined || category_id === ''
          ? null
          : Number(category_id),
      scheduled_date: typeof scheduled_date === 'string' ? scheduled_date : null,
      location: typeof location === 'string' ? location : null,
      max_participants: maxParts,
      evidence_required: evidence_required === false || evidence_required === 0 ? false : true,
      points_awarded: points,
      status: typeof status === 'string' ? status : 'upcoming',
      created_by: user!.id,
    });

    logger.info('CSR activity created via API', { id: created.id, userId: user!.id });
    return successResponse(created, 'CSR activity created', 201);
  } catch (err) {
    logger.error('POST /api/social/csr-activities error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, SOCIAL_MANAGE_ROLES)) {
      return errorResponse('Access denied. Manager role required.', 403, 'FORBIDDEN');
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
    const activityId = Number(id);
    if (!Number.isInteger(activityId) || activityId <= 0) {
      return errorResponse('Valid id is required', 400, 'VALIDATION_ERROR');
    }

    if (rest.status !== undefined && !VALID_STATUSES.includes(rest.status as string)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }
    if (
      rest.scheduled_date !== undefined &&
      rest.scheduled_date !== null &&
      rest.scheduled_date !== '' &&
      (typeof rest.scheduled_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rest.scheduled_date))
    ) {
      return errorResponse('scheduled_date must be YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }

    const updated = await updateCsrActivity(activityId, {
      title: typeof rest.title === 'string' ? rest.title : undefined,
      description:
        rest.description === null || typeof rest.description === 'string'
          ? (rest.description as string | null)
          : undefined,
      category_id:
        rest.category_id === null
          ? null
          : rest.category_id !== undefined
            ? Number(rest.category_id)
            : undefined,
      scheduled_date:
        rest.scheduled_date === null || rest.scheduled_date === ''
          ? null
          : typeof rest.scheduled_date === 'string'
            ? rest.scheduled_date
            : undefined,
      location:
        rest.location === null || typeof rest.location === 'string'
          ? (rest.location as string | null)
          : undefined,
      max_participants:
        rest.max_participants === null || rest.max_participants === ''
          ? null
          : rest.max_participants !== undefined
            ? Number(rest.max_participants)
            : undefined,
      evidence_required:
        rest.evidence_required === undefined
          ? undefined
          : rest.evidence_required === true ||
            rest.evidence_required === 1 ||
            rest.evidence_required === '1',
      points_awarded:
        rest.points_awarded !== undefined ? Number(rest.points_awarded) : undefined,
      status: typeof rest.status === 'string' ? rest.status : undefined,
    });

    if (!updated) {
      return errorResponse('CSR activity not found', 404, 'NOT_FOUND');
    }

    logger.info('CSR activity updated via API', { id: activityId, userId: user!.id });
    return successResponse(updated, 'CSR activity updated');
  } catch (err) {
    logger.error('PUT /api/social/csr-activities error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
