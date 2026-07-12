// src/app/api/environmental/goals/route.ts
// GET  /api/environmental/goals — list goals + stats
// POST /api/environmental/goals — create goal
// PUT  /api/environmental/goals — update goal / progress

import { NextRequest } from 'next/server';
import {
  listEnvironmentalGoals,
  createEnvironmentalGoal,
  updateEnvironmentalGoal,
  getGoalStats,
  getEnvironmentalGoalById,
} from '@/services/environmentalGoalService';
import { listActiveDepartments } from '@/services/departmentService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { getAuthUser, hasRole, ENV_READ_ROLES, ENV_WRITE_ROLES } from '@/lib/requestAuth';
import logger from '@/lib/logger';

const VALID_STATUSES = ['active', 'at_risk', 'completed', 'cancelled', 'archived'];

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, ENV_READ_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const includeMeta = searchParams.get('meta') === '1';

    const deptFilter =
      user!.role === 'departmental_head' ? user!.department_id : undefined;

    const [items, stats] = await Promise.all([
      listEnvironmentalGoals({ departmentId: deptFilter, status }),
      getGoalStats({ departmentId: deptFilter }),
    ]);

    let departments: Awaited<ReturnType<typeof listActiveDepartments>> = [];
    if (includeMeta) {
      departments = await listActiveDepartments();
    }

    return successResponse({ items, stats, departments }, 'Environmental goals retrieved');
  } catch (err) {
    logger.error('GET /api/environmental/goals error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, ENV_WRITE_ROLES)) {
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
      name,
      department_id,
      target_value,
      current_value,
      baseline_value,
      unit,
      deadline,
      status,
      description,
    } = body as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('Name is required (min 2 characters)', 400, 'VALIDATION_ERROR');
    }
    if (typeof unit !== 'string' || !unit.trim()) {
      return errorResponse('Unit is required', 400, 'VALIDATION_ERROR');
    }
    if (typeof deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      return errorResponse('deadline must be YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }

    const target = Number(target_value);
    if (!Number.isFinite(target)) {
      return errorResponse('target_value must be a number', 400, 'VALIDATION_ERROR');
    }

    let resolvedDeptId: number | null =
      department_id === null || department_id === undefined || department_id === ''
        ? null
        : Number(department_id);

    if (user!.role === 'departmental_head') {
      if (!user!.department_id) {
        return errorResponse(
          'Your account has no department assigned. Contact an administrator.',
          400,
          'NO_DEPARTMENT',
        );
      }
      resolvedDeptId = user!.department_id;
    }

    if (status !== undefined && !VALID_STATUSES.includes(status as string)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }

    const created = await createEnvironmentalGoal({
      name,
      department_id: resolvedDeptId,
      target_value: target,
      current_value:
        current_value === undefined || current_value === null || current_value === ''
          ? undefined
          : Number(current_value),
      baseline_value:
        baseline_value === undefined || baseline_value === null || baseline_value === ''
          ? null
          : Number(baseline_value),
      unit,
      deadline,
      status: typeof status === 'string' ? status : 'active',
      description: typeof description === 'string' ? description : null,
      created_by: user!.id,
    });

    logger.info('Environmental goal created via API', {
      id: created.id,
      userId: user!.id,
    });
    return successResponse(created, 'Environmental goal created', 201);
  } catch (err) {
    logger.error('POST /api/environmental/goals error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, ENV_WRITE_ROLES)) {
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
    const goalId = Number(id);
    if (!Number.isInteger(goalId) || goalId <= 0) {
      return errorResponse('Valid id is required', 400, 'VALIDATION_ERROR');
    }

    // Departmental heads can only update their department's goals
    if (user!.role === 'departmental_head') {
      const existing = await getEnvironmentalGoalById(goalId);
      if (!existing) {
        return errorResponse('Goal not found', 404, 'NOT_FOUND');
      }
      if (existing.department_id !== user!.department_id) {
        return errorResponse('Access denied for this goal', 403, 'FORBIDDEN');
      }
      // Prevent reassignment outside their department
      if (rest.department_id !== undefined) {
        rest.department_id = user!.department_id;
      }
    }

    if (rest.status !== undefined && !VALID_STATUSES.includes(rest.status as string)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }
    if (rest.deadline !== undefined && (typeof rest.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rest.deadline))) {
      return errorResponse('deadline must be YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }

    const updated = await updateEnvironmentalGoal(goalId, {
      name: typeof rest.name === 'string' ? rest.name : undefined,
      department_id:
        rest.department_id === null
          ? null
          : rest.department_id !== undefined
            ? Number(rest.department_id)
            : undefined,
      target_value:
        rest.target_value !== undefined ? Number(rest.target_value) : undefined,
      current_value:
        rest.current_value !== undefined ? Number(rest.current_value) : undefined,
      baseline_value:
        rest.baseline_value === null
          ? null
          : rest.baseline_value !== undefined
            ? Number(rest.baseline_value)
            : undefined,
      unit: typeof rest.unit === 'string' ? rest.unit : undefined,
      deadline: typeof rest.deadline === 'string' ? rest.deadline : undefined,
      status: typeof rest.status === 'string' ? rest.status : undefined,
      description:
        rest.description === null || typeof rest.description === 'string'
          ? (rest.description as string | null)
          : undefined,
    });

    if (!updated) {
      return errorResponse('Goal not found', 404, 'NOT_FOUND');
    }

    logger.info('Environmental goal updated via API', {
      id: goalId,
      userId: user!.id,
    });
    return successResponse(updated, 'Environmental goal updated');
  } catch (err) {
    logger.error('PUT /api/environmental/goals error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
