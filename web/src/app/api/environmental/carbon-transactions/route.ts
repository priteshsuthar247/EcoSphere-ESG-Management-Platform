// src/app/api/environmental/carbon-transactions/route.ts
// GET  /api/environmental/carbon-transactions — list + summary
// POST /api/environmental/carbon-transactions — log a transaction

import { NextRequest } from 'next/server';
import {
  listCarbonTransactions,
  createCarbonTransaction,
  getCarbonSummary,
  type CarbonSourceType,
  type LifecycleStage,
} from '@/services/carbonTransactionService';
import { listEmissionFactors } from '@/services/emissionFactorService';
import { listProducts } from '@/services/productService';
import { listActiveDepartments } from '@/services/departmentService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { getAuthUser, hasRole, ENV_READ_ROLES, ENV_WRITE_ROLES } from '@/lib/requestAuth';
import logger from '@/lib/logger';

const VALID_SOURCES: CarbonSourceType[] = [
  'purchase',
  'manufacturing',
  'expense',
  'fleet',
  'manual_entry',
  'other',
];

const VALID_STAGES: LifecycleStage[] = [
  'raw_material_sourcing',
  'inbound_transport',
  'manufacturing_production',
  'outbound_transport_distribution',
  'packaging',
  'use_phase',
  'end_of_life',
  'other',
];

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, ENV_READ_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
    }

    // Departmental heads only see their department data
    const deptFilter =
      user!.role === 'departmental_head' ? user!.department_id : undefined;

    const { searchParams } = new URL(request.url);
    const includeMeta = searchParams.get('meta') === '1';
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const scope = searchParams.get('scope') || undefined;

    const [items, summary] = await Promise.all([
      listCarbonTransactions({
        departmentId: deptFilter,
        search: search || undefined,
        scope: scope && scope !== 'all' ? scope : undefined,
      }),
      getCarbonSummary({ departmentId: deptFilter }),
    ]);

    let meta: {
      emission_factors: Awaited<ReturnType<typeof listEmissionFactors>>;
      products: Awaited<ReturnType<typeof listProducts>>;
      departments: Awaited<ReturnType<typeof listActiveDepartments>>;
    } | null = null;

    if (includeMeta) {
      const [emission_factors, products, departments] = await Promise.all([
        listEmissionFactors({ status: 'active' }),
        listProducts({ status: 'active' }),
        listActiveDepartments(),
      ]);
      meta = { emission_factors, products, departments };
    }

    return successResponse({ items, summary, meta }, 'Carbon transactions retrieved');
  } catch (err) {
    logger.error('GET /api/environmental/carbon-transactions error', {
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
      transaction_date,
      source_type,
      source_reference,
      source_description,
      emission_factor_id,
      quantity,
      calculated_emissions_kgco2e,
      department_id,
      scope,
      product_id,
      lifecycle_stage,
      notes,
    } = body as Record<string, unknown>;

    if (typeof transaction_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(transaction_date)) {
      return errorResponse('transaction_date must be YYYY-MM-DD', 400, 'VALIDATION_ERROR');
    }
    if (!VALID_SOURCES.includes(source_type as CarbonSourceType)) {
      return errorResponse('Invalid source_type', 400, 'VALIDATION_ERROR');
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return errorResponse('quantity must be a positive number', 400, 'VALIDATION_ERROR');
    }

    if (
      lifecycle_stage !== undefined &&
      lifecycle_stage !== null &&
      !VALID_STAGES.includes(lifecycle_stage as LifecycleStage)
    ) {
      return errorResponse('Invalid lifecycle_stage', 400, 'VALIDATION_ERROR');
    }

    // Departmental heads are forced to their own department
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

    if (resolvedDeptId !== null && (!Number.isInteger(resolvedDeptId) || resolvedDeptId <= 0)) {
      return errorResponse('Invalid department_id', 400, 'VALIDATION_ERROR');
    }

    try {
      const created = await createCarbonTransaction({
        transaction_date,
        source_type: source_type as CarbonSourceType,
        source_reference: typeof source_reference === 'string' ? source_reference : null,
        source_description: typeof source_description === 'string' ? source_description : null,
        emission_factor_id:
          emission_factor_id === null || emission_factor_id === undefined || emission_factor_id === ''
            ? null
            : Number(emission_factor_id),
        quantity: qty,
        calculated_emissions_kgco2e:
          calculated_emissions_kgco2e === null ||
          calculated_emissions_kgco2e === undefined ||
          calculated_emissions_kgco2e === ''
            ? null
            : Number(calculated_emissions_kgco2e),
        department_id: resolvedDeptId,
        scope: typeof scope === 'string' ? scope : null,
        product_id:
          product_id === null || product_id === undefined || product_id === ''
            ? null
            : Number(product_id),
        lifecycle_stage: (lifecycle_stage as LifecycleStage) ?? null,
        notes: typeof notes === 'string' ? notes : null,
        created_by: user!.id,
      });

      logger.info('Carbon transaction created via API', {
        id: created.id,
        userId: user!.id,
      });
      return successResponse(created, 'Carbon transaction logged', 201);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'INVALID_EMISSION_FACTOR') {
        return errorResponse('Emission factor not found or inactive', 400, 'INVALID_EMISSION_FACTOR');
      }
      if (msg === 'EMISSION_FACTOR_REQUIRED') {
        return errorResponse(
          'Auto emission calculation is enabled. Link an emission factor for purchase, manufacturing, expense, or fleet transactions.',
          400,
          'EMISSION_FACTOR_REQUIRED',
        );
      }
      if (msg === 'EMISSIONS_REQUIRED') {
        return errorResponse(
          'Provide an emission_factor_id (auto-calc) or calculated_emissions_kgco2e',
          400,
          'EMISSIONS_REQUIRED',
        );
      }
      throw err;
    }
  } catch (err) {
    logger.error('POST /api/environmental/carbon-transactions error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
