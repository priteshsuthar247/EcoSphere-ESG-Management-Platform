// src/app/api/environmental/products/route.ts
// GET  /api/environmental/products — list products + stats
// POST /api/environmental/products — create product
// PUT  /api/environmental/products — update product

import { NextRequest } from 'next/server';
import {
  listProducts,
  createProduct,
  updateProduct,
  getProductStats,
  listLifecycleEmissions,
  createLifecycleEmission,
  type EntityStatus,
  type LifecycleStage,
} from '@/services/productService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { getAuthUser, hasRole, ENV_PRODUCT_ROLES } from '@/lib/requestAuth';
import logger from '@/lib/logger';

const VALID_STATUSES: EntityStatus[] = ['active', 'inactive', 'draft', 'archived'];
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
    if (!hasRole(user, ENV_PRODUCT_ROLES)) {
      return errorResponse('Access denied.', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as EntityStatus | 'all') || 'all';
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const productId = searchParams.get('id');

    if (productId) {
      const id = Number(productId);
      if (!Number.isInteger(id) || id <= 0) {
        return errorResponse('Invalid product id', 400, 'VALIDATION_ERROR');
      }
      const lifecycle = await listLifecycleEmissions(id);
      return successResponse({ lifecycle }, 'Lifecycle emissions retrieved');
    }

    const [items, stats] = await Promise.all([
      listProducts({ status, search: search || undefined }),
      getProductStats(),
    ]);

    return successResponse({ items, stats }, 'Products retrieved');
  } catch (err) {
    logger.error('GET /api/environmental/products error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, ENV_PRODUCT_ROLES)) {
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

    // Nested action: add lifecycle emission
    if (payload.action === 'lifecycle') {
      const product_id = Number(payload.product_id);
      const emissions = Number(payload.emissions_kgco2e);
      const stage = payload.lifecycle_stage as LifecycleStage;

      if (!Number.isInteger(product_id) || product_id <= 0) {
        return errorResponse('Valid product_id is required', 400, 'VALIDATION_ERROR');
      }
      if (!VALID_STAGES.includes(stage)) {
        return errorResponse('Invalid lifecycle_stage', 400, 'VALIDATION_ERROR');
      }
      if (!Number.isFinite(emissions) || emissions < 0) {
        return errorResponse('emissions_kgco2e must be a non-negative number', 400, 'VALIDATION_ERROR');
      }

      const created = await createLifecycleEmission({
        product_id,
        lifecycle_stage: stage,
        emissions_kgco2e: emissions,
        source_type: typeof payload.source_type === 'string' ? payload.source_type : null,
        calculation_method:
          typeof payload.calculation_method === 'string'
            ? payload.calculation_method
            : 'measured',
        notes: typeof payload.notes === 'string' ? payload.notes : null,
        created_by: user!.id,
      });

      return successResponse(created, 'Lifecycle emission recorded', 201);
    }

    const { name, sku, category, carbon_footprint_kgco2e_per_unit, status } = payload;

    if (typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('Name is required (min 2 characters)', 400, 'VALIDATION_ERROR');
    }
    if (status !== undefined && !VALID_STATUSES.includes(status as EntityStatus)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }

    let footprint: number | null = null;
    if (carbon_footprint_kgco2e_per_unit !== undefined && carbon_footprint_kgco2e_per_unit !== null && carbon_footprint_kgco2e_per_unit !== '') {
      footprint = Number(carbon_footprint_kgco2e_per_unit);
      if (!Number.isFinite(footprint) || footprint < 0) {
        return errorResponse('carbon_footprint_kgco2e_per_unit must be non-negative', 400, 'VALIDATION_ERROR');
      }
    }

    try {
      const created = await createProduct({
        name,
        sku: typeof sku === 'string' ? sku : null,
        category: typeof category === 'string' ? category : null,
        carbon_footprint_kgco2e_per_unit: footprint,
        status: (status as EntityStatus) ?? 'active',
      });
      logger.info('Product created via API', { id: created.id, userId: user!.id });
      return successResponse(created, 'Product created', 201);
    } catch (err) {
      if ((err as Error).message === 'SKU_ALREADY_EXISTS') {
        return errorResponse('SKU already exists', 409, 'DUPLICATE_SKU');
      }
      throw err;
    }
  } catch (err) {
    logger.error('POST /api/environmental/products error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, ENV_PRODUCT_ROLES)) {
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
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return errorResponse('Valid id is required', 400, 'VALIDATION_ERROR');
    }

    if (rest.status !== undefined && !VALID_STATUSES.includes(rest.status as EntityStatus)) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }

    let footprint: number | null | undefined = undefined;
    if (rest.carbon_footprint_kgco2e_per_unit !== undefined) {
      if (rest.carbon_footprint_kgco2e_per_unit === null || rest.carbon_footprint_kgco2e_per_unit === '') {
        footprint = null;
      } else {
        footprint = Number(rest.carbon_footprint_kgco2e_per_unit);
        if (!Number.isFinite(footprint) || footprint < 0) {
          return errorResponse('carbon_footprint_kgco2e_per_unit must be non-negative', 400, 'VALIDATION_ERROR');
        }
      }
    }

    try {
      const updated = await updateProduct(productId, {
        name: typeof rest.name === 'string' ? rest.name : undefined,
        sku: rest.sku === null || typeof rest.sku === 'string' ? (rest.sku as string | null) : undefined,
        category:
          rest.category === null || typeof rest.category === 'string'
            ? (rest.category as string | null)
            : undefined,
        carbon_footprint_kgco2e_per_unit: footprint,
        status: rest.status as EntityStatus | undefined,
      });

      if (!updated) {
        return errorResponse('Product not found', 404, 'NOT_FOUND');
      }

      logger.info('Product updated via API', { id: productId, userId: user!.id });
      return successResponse(updated, 'Product updated');
    } catch (err) {
      if ((err as Error).message === 'SKU_ALREADY_EXISTS') {
        return errorResponse('SKU already exists', 409, 'DUPLICATE_SKU');
      }
      throw err;
    }
  } catch (err) {
    logger.error('PUT /api/environmental/products error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
