// src/services/carbonTransactionService.ts
// DB access for carbon emission transactions.

import pool from '@/config/db';
import logger from '@/lib/logger';
import { getEmissionFactorById } from '@/services/emissionFactorService';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type CarbonSourceType =
  | 'purchase'
  | 'manufacturing'
  | 'expense'
  | 'fleet'
  | 'manual_entry'
  | 'other';

export type LifecycleStage =
  | 'raw_material_sourcing'
  | 'inbound_transport'
  | 'manufacturing_production'
  | 'outbound_transport_distribution'
  | 'packaging'
  | 'use_phase'
  | 'end_of_life'
  | 'other';

export interface CarbonTransaction extends RowDataPacket {
  id: number;
  transaction_date: string;
  source_type: CarbonSourceType;
  source_reference: string | null;
  source_description: string | null;
  emission_factor_id: number | null;
  emission_factor_name: string | null;
  quantity: number;
  calculated_emissions_kgco2e: number;
  department_id: number | null;
  department_name: string | null;
  scope: string | null;
  product_id: number | null;
  product_name: string | null;
  lifecycle_stage: LifecycleStage | null;
  notes: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface CreateCarbonTransactionInput {
  transaction_date: string;
  source_type: CarbonSourceType;
  source_reference?: string | null;
  source_description?: string | null;
  emission_factor_id?: number | null;
  quantity: number;
  calculated_emissions_kgco2e?: number | null;
  department_id?: number | null;
  scope?: string | null;
  product_id?: number | null;
  lifecycle_stage?: LifecycleStage | null;
  notes?: string | null;
  created_by?: number | null;
}

export async function listCarbonTransactions(options?: {
  departmentId?: number | null;
  scope?: string;
  limit?: number;
}): Promise<CarbonTransaction[]> {
  try {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('ct.department_id = ?');
      params.push(options.departmentId);
    }
    if (options?.scope) {
      clauses.push('ct.scope = ?');
      params.push(options.scope);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);

    const [rows] = await pool.execute<CarbonTransaction[]>(
      `SELECT ct.id, ct.transaction_date, ct.source_type, ct.source_reference,
              ct.source_description, ct.emission_factor_id, ef.name AS emission_factor_name,
              ct.quantity, ct.calculated_emissions_kgco2e, ct.department_id,
              d.name AS department_name, ct.scope, ct.product_id, p.name AS product_name,
              ct.lifecycle_stage, ct.notes, ct.created_by, u.name AS created_by_name,
              ct.created_at
       FROM carbon_transactions ct
       LEFT JOIN emission_factors ef ON ef.id = ct.emission_factor_id
       LEFT JOIN departments d ON d.id = ct.department_id
       LEFT JOIN products p ON p.id = ct.product_id
       LEFT JOIN users u ON u.id = ct.created_by
       ${where}
       ORDER BY ct.transaction_date DESC, ct.id DESC
       LIMIT ${limit}`,
      params,
    );

    return rows.map((r) => ({
      ...r,
      quantity: Number(r.quantity),
      calculated_emissions_kgco2e: Number(r.calculated_emissions_kgco2e),
    }));
  } catch (err) {
    logger.error('listCarbonTransactions failed', { error: (err as Error).message });
    throw err;
  }
}

export async function createCarbonTransaction(
  input: CreateCarbonTransactionInput,
): Promise<CarbonTransaction> {
  try {
    let emissions = input.calculated_emissions_kgco2e ?? null;
    let scope = input.scope ?? null;
    let emissionFactorId = input.emission_factor_id ?? null;

    if (emissionFactorId) {
      const factor = await getEmissionFactorById(emissionFactorId);
      if (!factor || factor.status !== 'active') {
        throw new Error('INVALID_EMISSION_FACTOR');
      }
      emissions = Number(input.quantity) * Number(factor.value_kgco2e_per_unit);
      if (!scope && factor.scope) {
        scope = factor.scope;
      }
    }

    if (emissions === null || Number.isNaN(Number(emissions))) {
      throw new Error('EMISSIONS_REQUIRED');
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO carbon_transactions
         (transaction_date, source_type, source_reference, source_description,
          emission_factor_id, quantity, calculated_emissions_kgco2e, department_id,
          scope, product_id, lifecycle_stage, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.transaction_date,
        input.source_type,
        input.source_reference?.trim() || null,
        input.source_description?.trim() || null,
        emissionFactorId,
        input.quantity,
        emissions,
        input.department_id ?? null,
        scope,
        input.product_id ?? null,
        input.lifecycle_stage ?? null,
        input.notes?.trim() || null,
        input.created_by ?? null,
      ],
    );

    // Optionally roll product lifecycle stage when product + stage provided
    if (input.product_id && input.lifecycle_stage) {
      await pool.execute(
        `INSERT INTO product_lifecycle_emissions
           (product_id, lifecycle_stage, emissions_kgco2e, source_type,
            carbon_transaction_id, calculation_method, created_by)
         VALUES (?, ?, ?, ?, ?, 'measured', ?)
         ON DUPLICATE KEY UPDATE
           emissions_kgco2e = emissions_kgco2e + VALUES(emissions_kgco2e),
           carbon_transaction_id = VALUES(carbon_transaction_id)`,
        [
          input.product_id,
          input.lifecycle_stage,
          emissions,
          input.source_type,
          result.insertId,
          input.created_by ?? null,
        ],
      );

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
    }

    const [rows] = await pool.execute<CarbonTransaction[]>(
      `SELECT ct.id, ct.transaction_date, ct.source_type, ct.source_reference,
              ct.source_description, ct.emission_factor_id, ef.name AS emission_factor_name,
              ct.quantity, ct.calculated_emissions_kgco2e, ct.department_id,
              d.name AS department_name, ct.scope, ct.product_id, p.name AS product_name,
              ct.lifecycle_stage, ct.notes, ct.created_by, u.name AS created_by_name,
              ct.created_at
       FROM carbon_transactions ct
       LEFT JOIN emission_factors ef ON ef.id = ct.emission_factor_id
       LEFT JOIN departments d ON d.id = ct.department_id
       LEFT JOIN products p ON p.id = ct.product_id
       LEFT JOIN users u ON u.id = ct.created_by
       WHERE ct.id = ?
       LIMIT 1`,
      [result.insertId],
    );

    const created = rows[0];
    if (!created) throw new Error('CARBON_TX_CREATE_FAILED');
    logger.info('Carbon transaction created', {
      id: created.id,
      emissions: created.calculated_emissions_kgco2e,
    });
    return {
      ...created,
      quantity: Number(created.quantity),
      calculated_emissions_kgco2e: Number(created.calculated_emissions_kgco2e),
    };
  } catch (err) {
    logger.error('createCarbonTransaction failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getCarbonSummary(options?: {
  departmentId?: number | null;
}): Promise<{
  total_emissions: number;
  transaction_count: number;
  by_scope: { scope: string; emissions: number; count: number }[];
  by_source: { source_type: string; emissions: number; count: number }[];
}> {
  try {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('department_id = ?');
      params.push(options.departmentId);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [totals] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(calculated_emissions_kgco2e), 0) AS total_emissions,
         COUNT(*) AS transaction_count
       FROM carbon_transactions
       ${where}`,
      params,
    );

    const [byScope] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(scope, 'unset') AS scope,
              COALESCE(SUM(calculated_emissions_kgco2e), 0) AS emissions,
              COUNT(*) AS count
       FROM carbon_transactions
       ${where}
       GROUP BY scope
       ORDER BY scope`,
      params,
    );

    const [bySource] = await pool.execute<RowDataPacket[]>(
      `SELECT source_type,
              COALESCE(SUM(calculated_emissions_kgco2e), 0) AS emissions,
              COUNT(*) AS count
       FROM carbon_transactions
       ${where}
       GROUP BY source_type
       ORDER BY emissions DESC`,
      params,
    );

    return {
      total_emissions: Number(totals[0]?.total_emissions ?? 0),
      transaction_count: Number(totals[0]?.transaction_count ?? 0),
      by_scope: byScope.map((r) => ({
        scope: String(r.scope),
        emissions: Number(r.emissions),
        count: Number(r.count),
      })),
      by_source: bySource.map((r) => ({
        source_type: String(r.source_type),
        emissions: Number(r.emissions),
        count: Number(r.count),
      })),
    };
  } catch (err) {
    logger.error('getCarbonSummary failed', { error: (err as Error).message });
    throw err;
  }
}
