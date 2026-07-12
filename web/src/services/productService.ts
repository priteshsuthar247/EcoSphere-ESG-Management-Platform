// src/services/productService.ts
// DB access for product ESG profiles and lifecycle emissions.

import pool from '@/config/db';
import logger from '@/lib/logger';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type EntityStatus = 'active' | 'inactive' | 'draft' | 'archived';

export type LifecycleStage =
  | 'raw_material_sourcing'
  | 'inbound_transport'
  | 'manufacturing_production'
  | 'outbound_transport_distribution'
  | 'packaging'
  | 'use_phase'
  | 'end_of_life'
  | 'other';

export interface Product extends RowDataPacket {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  carbon_footprint_kgco2e_per_unit: number | null;
  esg_metrics: unknown;
  certifications: unknown;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  lifecycle_total_kgco2e?: number | null;
  lifecycle_stage_count?: number;
}

export interface ProductLifecycleEmission extends RowDataPacket {
  id: number;
  product_id: number;
  lifecycle_stage: LifecycleStage;
  emissions_kgco2e: number;
  source_type: string | null;
  carbon_transaction_id: number | null;
  calculation_method: string | null;
  valid_from: string | null;
  valid_to: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export interface CreateProductInput {
  name: string;
  sku?: string | null;
  category?: string | null;
  carbon_footprint_kgco2e_per_unit?: number | null;
  esg_metrics?: Record<string, unknown> | null;
  certifications?: unknown[] | null;
  status?: EntityStatus;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string | null;
  category?: string | null;
  carbon_footprint_kgco2e_per_unit?: number | null;
  esg_metrics?: Record<string, unknown> | null;
  certifications?: unknown[] | null;
  status?: EntityStatus;
}

export interface CreateLifecycleEmissionInput {
  product_id: number;
  lifecycle_stage: LifecycleStage;
  emissions_kgco2e: number;
  source_type?: string | null;
  calculation_method?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  notes?: string | null;
  created_by?: number | null;
}

function parseJsonField(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function normalizeProduct(row: Product): Product {
  return {
    ...row,
    esg_metrics: parseJsonField(row.esg_metrics),
    certifications: parseJsonField(row.certifications),
    carbon_footprint_kgco2e_per_unit:
      row.carbon_footprint_kgco2e_per_unit === null
        ? null
        : Number(row.carbon_footprint_kgco2e_per_unit),
    lifecycle_total_kgco2e:
      row.lifecycle_total_kgco2e === null || row.lifecycle_total_kgco2e === undefined
        ? null
        : Number(row.lifecycle_total_kgco2e),
    lifecycle_stage_count: Number(row.lifecycle_stage_count ?? 0),
  };
}

export async function listProducts(options?: {
  status?: EntityStatus | 'all';
  search?: string;
}): Promise<Product[]> {
  try {
    const clauses: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    if (options?.status && options.status !== 'all') {
      clauses.push('p.status = ?');
      params.push(options.status);
    }
    if (options?.search?.trim()) {
      const q = `%${options.search.trim().replace(/[%_]/g, '\\$&')}%`;
      clauses.push(
        '(p.name LIKE ? OR p.sku LIKE ? OR p.category LIKE ? OR CAST(p.id AS CHAR) LIKE ?)',
      );
      params.push(q, q, q, q);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute<Product[]>(
      `SELECT p.id, p.name, p.sku, p.category, p.carbon_footprint_kgco2e_per_unit,
              p.esg_metrics, p.certifications, p.status, p.created_at, p.updated_at,
              COALESCE(SUM(ple.emissions_kgco2e), 0) AS lifecycle_total_kgco2e,
              COUNT(ple.id) AS lifecycle_stage_count
       FROM products p
       LEFT JOIN product_lifecycle_emissions ple ON ple.product_id = p.id
       ${where}
       GROUP BY p.id
       ORDER BY p.name ASC`,
      params,
    );
    return rows.map(normalizeProduct);
  } catch (err) {
    logger.error('listProducts failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getProductById(id: number): Promise<Product | null> {
  try {
    const [rows] = await pool.execute<Product[]>(
      `SELECT p.id, p.name, p.sku, p.category, p.carbon_footprint_kgco2e_per_unit,
              p.esg_metrics, p.certifications, p.status, p.created_at, p.updated_at,
              COALESCE(SUM(ple.emissions_kgco2e), 0) AS lifecycle_total_kgco2e,
              COUNT(ple.id) AS lifecycle_stage_count
       FROM products p
       LEFT JOIN product_lifecycle_emissions ple ON ple.product_id = p.id
       WHERE p.id = ?
       GROUP BY p.id
       LIMIT 1`,
      [id],
    );
    return rows[0] ? normalizeProduct(rows[0]) : null;
  } catch (err) {
    logger.error('getProductById failed', { error: (err as Error).message, id });
    throw err;
  }
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO products
         (name, sku, category, carbon_footprint_kgco2e_per_unit, esg_metrics, certifications, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name.trim(),
        input.sku?.trim() || null,
        input.category?.trim() || null,
        input.carbon_footprint_kgco2e_per_unit ?? null,
        input.esg_metrics ? JSON.stringify(input.esg_metrics) : null,
        input.certifications ? JSON.stringify(input.certifications) : null,
        input.status ?? 'active',
      ],
    );

    const created = await getProductById(result.insertId);
    if (!created) throw new Error('PRODUCT_CREATE_FAILED');
    logger.info('Product created', { id: created.id, sku: created.sku });
    return created;
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('Duplicate') || (err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new Error('SKU_ALREADY_EXISTS');
    }
    logger.error('createProduct failed', { error: message });
    throw err;
  }
}

export async function updateProduct(
  id: number,
  input: UpdateProductInput,
): Promise<Product | null> {
  try {
    const fields: string[] = [];
    const values: Array<string | number | boolean | null> = [];

    if (input.name !== undefined) {
      fields.push('name = ?');
      values.push(input.name.trim());
    }
    if (input.sku !== undefined) {
      fields.push('sku = ?');
      values.push(input.sku?.trim() || null);
    }
    if (input.category !== undefined) {
      fields.push('category = ?');
      values.push(input.category?.trim() || null);
    }
    if (input.carbon_footprint_kgco2e_per_unit !== undefined) {
      fields.push('carbon_footprint_kgco2e_per_unit = ?');
      values.push(input.carbon_footprint_kgco2e_per_unit);
    }
    if (input.esg_metrics !== undefined) {
      fields.push('esg_metrics = ?');
      values.push(input.esg_metrics ? JSON.stringify(input.esg_metrics) : null);
    }
    if (input.certifications !== undefined) {
      fields.push('certifications = ?');
      values.push(input.certifications ? JSON.stringify(input.certifications) : null);
    }
    if (input.status !== undefined) {
      fields.push('status = ?');
      values.push(input.status);
    }

    if (fields.length === 0) return getProductById(id);

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    if (result.affectedRows === 0) return null;
    logger.info('Product updated', { id });
    return getProductById(id);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('Duplicate') || (err as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new Error('SKU_ALREADY_EXISTS');
    }
    logger.error('updateProduct failed', { error: message, id });
    throw err;
  }
}

export async function listLifecycleEmissions(
  productId: number,
): Promise<ProductLifecycleEmission[]> {
  try {
    const [rows] = await pool.execute<ProductLifecycleEmission[]>(
      `SELECT id, product_id, lifecycle_stage, emissions_kgco2e, source_type,
              carbon_transaction_id, calculation_method, valid_from, valid_to,
              notes, created_by, created_at
       FROM product_lifecycle_emissions
       WHERE product_id = ?
       ORDER BY FIELD(lifecycle_stage,
         'raw_material_sourcing','inbound_transport','manufacturing_production',
         'outbound_transport_distribution','packaging','use_phase','end_of_life','other'),
         id ASC`,
      [productId],
    );
    return rows.map((r) => ({
      ...r,
      emissions_kgco2e: Number(r.emissions_kgco2e),
    }));
  } catch (err) {
    logger.error('listLifecycleEmissions failed', {
      error: (err as Error).message,
      productId,
    });
    throw err;
  }
}

export async function createLifecycleEmission(
  input: CreateLifecycleEmissionInput,
): Promise<ProductLifecycleEmission> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO product_lifecycle_emissions
         (product_id, lifecycle_stage, emissions_kgco2e, source_type,
          calculation_method, valid_from, valid_to, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.product_id,
        input.lifecycle_stage,
        input.emissions_kgco2e,
        input.source_type ?? null,
        input.calculation_method ?? 'measured',
        input.valid_from || null,
        input.valid_to || null,
        input.notes?.trim() || null,
        input.created_by ?? null,
      ],
    );

    // Keep product footprint in sync with lifecycle total when possible
    await pool.execute(
      `UPDATE products p
       SET carbon_footprint_kgco2e_per_unit = (
         SELECT COALESCE(SUM(emissions_kgco2e), 0)
         FROM product_lifecycle_emissions
         WHERE product_id = p.id
       )
       WHERE p.id = ?`,
      [input.product_id],
    );

    const [rows] = await pool.execute<ProductLifecycleEmission[]>(
      `SELECT id, product_id, lifecycle_stage, emissions_kgco2e, source_type,
              carbon_transaction_id, calculation_method, valid_from, valid_to,
              notes, created_by, created_at
       FROM product_lifecycle_emissions WHERE id = ? LIMIT 1`,
      [result.insertId],
    );
    const created = rows[0];
    if (!created) throw new Error('LIFECYCLE_CREATE_FAILED');
    logger.info('Lifecycle emission created', {
      id: created.id,
      productId: input.product_id,
      stage: input.lifecycle_stage,
    });
    return { ...created, emissions_kgco2e: Number(created.emissions_kgco2e) };
  } catch (err) {
    logger.error('createLifecycleEmission failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getProductStats(): Promise<{
  total: number;
  active: number;
  total_footprint: number;
}> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
         COALESCE(SUM(carbon_footprint_kgco2e_per_unit), 0) AS total_footprint
       FROM products`,
    );
    return {
      total: Number(rows[0]?.total ?? 0),
      active: Number(rows[0]?.active ?? 0),
      total_footprint: Number(rows[0]?.total_footprint ?? 0),
    };
  } catch (err) {
    logger.error('getProductStats failed', { error: (err as Error).message });
    throw err;
  }
}
