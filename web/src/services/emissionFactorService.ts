// src/services/emissionFactorService.ts
// DB access for emission factors master data.

import pool from '@/config/db';
import logger from '@/lib/logger';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type EmissionScope = '1' | '2' | '3';
export type EntityStatus = 'active' | 'inactive' | 'draft' | 'archived';

export interface EmissionFactor extends RowDataPacket {
  id: number;
  name: string;
  scope: EmissionScope | null;
  category: string | null;
  value_kgco2e_per_unit: number;
  unit: string;
  source: string | null;
  valid_from: string | null;
  valid_to: string | null;
  status: EntityStatus;
  created_at: string;
}

export interface CreateEmissionFactorInput {
  name: string;
  scope?: EmissionScope | null;
  category?: string | null;
  value_kgco2e_per_unit: number;
  unit: string;
  source?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  status?: EntityStatus;
}

export interface UpdateEmissionFactorInput {
  name?: string;
  scope?: EmissionScope | null;
  category?: string | null;
  value_kgco2e_per_unit?: number;
  unit?: string;
  source?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  status?: EntityStatus;
}

export async function listEmissionFactors(options?: {
  status?: EntityStatus | 'all';
  scope?: EmissionScope;
}): Promise<EmissionFactor[]> {
  try {
    const clauses: string[] = [];
    const params: Array<string | number | boolean | null> = [];

    if (options?.status && options.status !== 'all') {
      clauses.push('status = ?');
      params.push(options.status);
    }
    if (options?.scope) {
      clauses.push('scope = ?');
      params.push(options.scope);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute<EmissionFactor[]>(
      `SELECT id, name, scope, category, value_kgco2e_per_unit, unit, source,
              valid_from, valid_to, status, created_at
       FROM emission_factors
       ${where}
       ORDER BY scope ASC, name ASC`,
      params,
    );
    return rows;
  } catch (err) {
    logger.error('listEmissionFactors failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getEmissionFactorById(id: number): Promise<EmissionFactor | null> {
  try {
    const [rows] = await pool.execute<EmissionFactor[]>(
      `SELECT id, name, scope, category, value_kgco2e_per_unit, unit, source,
              valid_from, valid_to, status, created_at
       FROM emission_factors WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  } catch (err) {
    logger.error('getEmissionFactorById failed', { error: (err as Error).message, id });
    throw err;
  }
}

export async function createEmissionFactor(
  input: CreateEmissionFactorInput,
): Promise<EmissionFactor> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO emission_factors
         (name, scope, category, value_kgco2e_per_unit, unit, source, valid_from, valid_to, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name.trim(),
        input.scope ?? null,
        input.category?.trim() || null,
        input.value_kgco2e_per_unit,
        input.unit.trim(),
        input.source?.trim() || null,
        input.valid_from || null,
        input.valid_to || null,
        input.status ?? 'active',
      ],
    );

    const created = await getEmissionFactorById(result.insertId);
    if (!created) throw new Error('EMISSION_FACTOR_CREATE_FAILED');
    logger.info('Emission factor created', { id: created.id, name: created.name });
    return created;
  } catch (err) {
    logger.error('createEmissionFactor failed', { error: (err as Error).message });
    throw err;
  }
}

export async function updateEmissionFactor(
  id: number,
  input: UpdateEmissionFactorInput,
): Promise<EmissionFactor | null> {
  try {
    const fields: string[] = [];
    const values: Array<string | number | boolean | null> = [];

    const map: Array<[keyof UpdateEmissionFactorInput, string]> = [
      ['name', 'name'],
      ['scope', 'scope'],
      ['category', 'category'],
      ['value_kgco2e_per_unit', 'value_kgco2e_per_unit'],
      ['unit', 'unit'],
      ['source', 'source'],
      ['valid_from', 'valid_from'],
      ['valid_to', 'valid_to'],
      ['status', 'status'],
    ];

    for (const [key, column] of map) {
      if (input[key] !== undefined) {
        fields.push(`${column} = ?`);
        const val = input[key];
        values.push(typeof val === 'string' ? val.trim() || null : val);
      }
    }

    if (fields.length === 0) return getEmissionFactorById(id);

    values.push(id);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE emission_factors SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );

    if (result.affectedRows === 0) return null;
    logger.info('Emission factor updated', { id });
    return getEmissionFactorById(id);
  } catch (err) {
    logger.error('updateEmissionFactor failed', { error: (err as Error).message, id });
    throw err;
  }
}

export async function getEmissionFactorStats(): Promise<{
  total: number;
  active: number;
  by_scope: { scope: string; count: number }[];
}> {
  try {
    const [totals] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active
       FROM emission_factors`,
    );
    const [byScope] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(scope, 'unset') AS scope, COUNT(*) AS count
       FROM emission_factors
       GROUP BY scope
       ORDER BY scope`,
    );
    return {
      total: Number(totals[0]?.total ?? 0),
      active: Number(totals[0]?.active ?? 0),
      by_scope: byScope.map((r) => ({ scope: String(r.scope), count: Number(r.count) })),
    };
  } catch (err) {
    logger.error('getEmissionFactorStats failed', { error: (err as Error).message });
    throw err;
  }
}
