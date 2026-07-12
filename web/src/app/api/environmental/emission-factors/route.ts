// src/app/api/environmental/emission-factors/route.ts
// GET  /api/environmental/emission-factors — list factors + stats
// POST /api/environmental/emission-factors — create factor
// PUT  /api/environmental/emission-factors — update factor

import { NextRequest } from 'next/server';
import {
  listEmissionFactors,
  createEmissionFactor,
  updateEmissionFactor,
  getEmissionFactorStats,
  type EmissionScope,
  type EntityStatus,
} from '@/services/emissionFactorService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { getAuthUser, hasRole, ENV_READ_ROLES, ENV_WRITE_ROLES } from '@/lib/requestAuth';
import logger from '@/lib/logger';

const VALID_SCOPES: EmissionScope[] = ['1', '2', '3'];
const VALID_STATUSES: EntityStatus[] = ['active', 'inactive', 'draft', 'archived'];

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, ENV_READ_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as EntityStatus | 'all') || 'all';
    const scope = searchParams.get('scope') as EmissionScope | null;

    if (scope && !VALID_SCOPES.includes(scope)) {
      return errorResponse('Invalid scope filter', 400, 'VALIDATION_ERROR');
    }

    const [items, stats] = await Promise.all([
      listEmissionFactors({
        status,
        scope: scope ?? undefined,
      }),
      getEmissionFactorStats(),
    ]);

    return successResponse({ items, stats }, 'Emission factors retrieved');
  } catch (err) {
    logger.error('GET /api/environmental/emission-factors error', {
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
      scope,
      category,
      value_kgco2e_per_unit,
      unit,
      source,
      valid_from,
      valid_to,
      status,
    } = body as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('Name is required (min 2 characters)', 400, 'VALIDATION_ERROR');
    }
    if (typeof unit !== 'string' || !unit.trim()) {
      return errorResponse('Unit is required', 400, 'VALIDATION_ERROR');
    }
    const value = Number(value_kgco2e_per_unit);
    if (!Number.isFinite(value) || value < 0) {
      return errorResponse('value_kgco2e_per_unit must be a non-negative number', 400, 'VALIDATION_ERROR');
    }
    if (scope !== undefined && scope !== null && !VALID_SCOPES.includes(scope as EmissionScope)) {
      return errorResponse('scope must be 1, 2, or 3', 400, 'VALIDATION_ERROR');
    }
    if (status !== undefined && !VALID_STATUSES.includes(status as EntityStatus)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }

    const created = await createEmissionFactor({
      name,
      scope: (scope as EmissionScope) ?? null,
      category: typeof category === 'string' ? category : null,
      value_kgco2e_per_unit: value,
      unit,
      source: typeof source === 'string' ? source : null,
      valid_from: typeof valid_from === 'string' ? valid_from : null,
      valid_to: typeof valid_to === 'string' ? valid_to : null,
      status: (status as EntityStatus) ?? 'active',
    });

    logger.info('Emission factor created via API', { id: created.id, userId: user!.id });
    return successResponse(created, 'Emission factor created', 201);
  } catch (err) {
    logger.error('POST /api/environmental/emission-factors error', {
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
    const factorId = Number(id);
    if (!Number.isInteger(factorId) || factorId <= 0) {
      return errorResponse('Valid id is required', 400, 'VALIDATION_ERROR');
    }

    if (rest.scope !== undefined && rest.scope !== null && !VALID_SCOPES.includes(rest.scope as EmissionScope)) {
      return errorResponse('scope must be 1, 2, or 3', 400, 'VALIDATION_ERROR');
    }
    if (rest.status !== undefined && !VALID_STATUSES.includes(rest.status as EntityStatus)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }
    if (rest.value_kgco2e_per_unit !== undefined) {
      const value = Number(rest.value_kgco2e_per_unit);
      if (!Number.isFinite(value) || value < 0) {
        return errorResponse('value_kgco2e_per_unit must be a non-negative number', 400, 'VALIDATION_ERROR');
      }
      rest.value_kgco2e_per_unit = value;
    }

    const updated = await updateEmissionFactor(factorId, {
      name: typeof rest.name === 'string' ? rest.name : undefined,
      scope: rest.scope as EmissionScope | null | undefined,
      category: rest.category === null || typeof rest.category === 'string' ? (rest.category as string | null) : undefined,
      value_kgco2e_per_unit:
        rest.value_kgco2e_per_unit !== undefined ? Number(rest.value_kgco2e_per_unit) : undefined,
      unit: typeof rest.unit === 'string' ? rest.unit : undefined,
      source: rest.source === null || typeof rest.source === 'string' ? (rest.source as string | null) : undefined,
      valid_from:
        rest.valid_from === null || typeof rest.valid_from === 'string'
          ? (rest.valid_from as string | null)
          : undefined,
      valid_to:
        rest.valid_to === null || typeof rest.valid_to === 'string'
          ? (rest.valid_to as string | null)
          : undefined,
      status: rest.status as EntityStatus | undefined,
    });

    if (!updated) {
      return errorResponse('Emission factor not found', 404, 'NOT_FOUND');
    }

    logger.info('Emission factor updated via API', { id: factorId, userId: user!.id });
    return successResponse(updated, 'Emission factor updated');
  } catch (err) {
    logger.error('PUT /api/environmental/emission-factors error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
