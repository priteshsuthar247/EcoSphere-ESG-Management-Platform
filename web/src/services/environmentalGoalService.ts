// src/services/environmentalGoalService.ts
// DB access for environmental / sustainability goals.

import pool from '@/config/db';
import logger from '@/lib/logger';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface EnvironmentalGoal extends RowDataPacket {
  id: number;
  name: string;
  department_id: number | null;
  department_name: string | null;
  target_value: number;
  current_value: number;
  baseline_value: number | null;
  unit: string;
  deadline: string;
  progress_percent: number;
  status: string;
  description: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  name: string;
  department_id?: number | null;
  target_value: number;
  current_value?: number;
  baseline_value?: number | null;
  unit: string;
  deadline: string;
  status?: string;
  description?: string | null;
  created_by?: number | null;
}

export interface UpdateGoalInput {
  name?: string;
  department_id?: number | null;
  target_value?: number;
  current_value?: number;
  baseline_value?: number | null;
  unit?: string;
  deadline?: string;
  status?: string;
  description?: string | null;
}

function computeProgress(
  current: number,
  target: number,
  baseline: number | null,
): number {
  if (!target || target === 0) return 0;

  // Reduction-style goal: baseline > target → progress toward reduction
  if (baseline !== null && baseline > target) {
    const span = baseline - target;
    if (span === 0) return current <= target ? 100 : 0;
    const progress = ((baseline - current) / span) * 100;
    return Math.max(0, Math.min(100, Number(progress.toFixed(2))));
  }

  // Increase / absolute target: progress = current / target
  const progress = (current / target) * 100;
  return Math.max(0, Math.min(100, Number(progress.toFixed(2))));
}

function normalizeGoal(row: EnvironmentalGoal): EnvironmentalGoal {
  return {
    ...row,
    target_value: Number(row.target_value),
    current_value: Number(row.current_value),
    baseline_value: row.baseline_value === null ? null : Number(row.baseline_value),
    progress_percent: Number(row.progress_percent),
  };
}

export async function listEnvironmentalGoals(options?: {
  departmentId?: number | null;
  status?: string | 'all';
  search?: string;
}): Promise<EnvironmentalGoal[]> {
  try {
    const clauses: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('g.department_id = ?');
      params.push(options.departmentId);
    }
    if (options?.status && options.status !== 'all') {
      clauses.push('g.status = ?');
      params.push(options.status);
    }
    if (options?.search?.trim()) {
      const q = `%${options.search.trim().replace(/[%_]/g, '\\$&')}%`;
      clauses.push(
        '(g.name LIKE ? OR g.description LIKE ? OR g.unit LIKE ? OR d.name LIKE ? OR CAST(g.id AS CHAR) LIKE ?)',
      );
      params.push(q, q, q, q, q);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute<EnvironmentalGoal[]>(
      `SELECT g.id, g.name, g.department_id, d.name AS department_name,
              g.target_value, g.current_value, g.baseline_value, g.unit,
              g.deadline, g.progress_percent, g.status, g.description,
              g.created_by, u.name AS created_by_name, g.created_at, g.updated_at
       FROM environmental_goals g
       LEFT JOIN departments d ON d.id = g.department_id
       LEFT JOIN users u ON u.id = g.created_by
       ${where}
       ORDER BY
         CASE g.status
           WHEN 'active' THEN 0
           WHEN 'at_risk' THEN 1
           WHEN 'completed' THEN 2
           ELSE 3
         END,
         g.deadline ASC`,
      params,
    );
    return rows.map(normalizeGoal);
  } catch (err) {
    logger.error('listEnvironmentalGoals failed', { error: (err as Error).message });
    throw err;
  }
}

export async function getEnvironmentalGoalById(
  id: number,
): Promise<EnvironmentalGoal | null> {
  try {
    const [rows] = await pool.execute<EnvironmentalGoal[]>(
      `SELECT g.id, g.name, g.department_id, d.name AS department_name,
              g.target_value, g.current_value, g.baseline_value, g.unit,
              g.deadline, g.progress_percent, g.status, g.description,
              g.created_by, u.name AS created_by_name, g.created_at, g.updated_at
       FROM environmental_goals g
       LEFT JOIN departments d ON d.id = g.department_id
       LEFT JOIN users u ON u.id = g.created_by
       WHERE g.id = ?
       LIMIT 1`,
      [id],
    );
    return rows[0] ? normalizeGoal(rows[0]) : null;
  } catch (err) {
    logger.error('getEnvironmentalGoalById failed', {
      error: (err as Error).message,
      id,
    });
    throw err;
  }
}

export async function createEnvironmentalGoal(
  input: CreateGoalInput,
): Promise<EnvironmentalGoal> {
  try {
    const current = input.current_value ?? input.baseline_value ?? 0;
    const baseline = input.baseline_value ?? null;
    const progress = computeProgress(current, input.target_value, baseline);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO environmental_goals
         (name, department_id, target_value, current_value, baseline_value,
          unit, deadline, progress_percent, status, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name.trim(),
        input.department_id ?? null,
        input.target_value,
        current,
        baseline,
        input.unit.trim(),
        input.deadline,
        progress,
        input.status ?? 'active',
        input.description?.trim() || null,
        input.created_by ?? null,
      ],
    );

    const created = await getEnvironmentalGoalById(result.insertId);
    if (!created) throw new Error('GOAL_CREATE_FAILED');
    logger.info('Environmental goal created', { id: created.id, name: created.name });
    return created;
  } catch (err) {
    logger.error('createEnvironmentalGoal failed', { error: (err as Error).message });
    throw err;
  }
}

export async function updateEnvironmentalGoal(
  id: number,
  input: UpdateGoalInput,
): Promise<EnvironmentalGoal | null> {
  try {
    const existing = await getEnvironmentalGoalById(id);
    if (!existing) return null;

    const next = {
      name: input.name !== undefined ? input.name.trim() : existing.name,
      department_id:
        input.department_id !== undefined ? input.department_id : existing.department_id,
      target_value:
        input.target_value !== undefined ? input.target_value : existing.target_value,
      current_value:
        input.current_value !== undefined ? input.current_value : existing.current_value,
      baseline_value:
        input.baseline_value !== undefined ? input.baseline_value : existing.baseline_value,
      unit: input.unit !== undefined ? input.unit.trim() : existing.unit,
      deadline: input.deadline !== undefined ? input.deadline : existing.deadline,
      status: input.status !== undefined ? input.status : existing.status,
      description:
        input.description !== undefined
          ? input.description?.trim() || null
          : existing.description,
    };

    const progress = computeProgress(
      next.current_value,
      next.target_value,
      next.baseline_value,
    );

    // Auto-complete when progress hits 100% and still active
    let status = next.status;
    if (progress >= 100 && status === 'active') {
      status = 'completed';
    }

    await pool.execute(
      `UPDATE environmental_goals
       SET name = ?, department_id = ?, target_value = ?, current_value = ?,
           baseline_value = ?, unit = ?, deadline = ?, progress_percent = ?,
           status = ?, description = ?
       WHERE id = ?`,
      [
        next.name,
        next.department_id,
        next.target_value,
        next.current_value,
        next.baseline_value,
        next.unit,
        next.deadline,
        progress,
        status,
        next.description,
        id,
      ],
    );

    logger.info('Environmental goal updated', { id, progress });
    return getEnvironmentalGoalById(id);
  } catch (err) {
    logger.error('updateEnvironmentalGoal failed', {
      error: (err as Error).message,
      id,
    });
    throw err;
  }
}

export async function getGoalStats(options?: {
  departmentId?: number | null;
}): Promise<{
  total: number;
  active: number;
  completed: number;
  avg_progress: number;
}> {
  try {
    const clauses: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    if (options?.departmentId !== undefined && options.departmentId !== null) {
      clauses.push('department_id = ?');
      params.push(options.departmentId);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
         COALESCE(AVG(progress_percent), 0) AS avg_progress
       FROM environmental_goals
       ${where}`,
      params,
    );

    return {
      total: Number(rows[0]?.total ?? 0),
      active: Number(rows[0]?.active ?? 0),
      completed: Number(rows[0]?.completed ?? 0),
      avg_progress: Number(Number(rows[0]?.avg_progress ?? 0).toFixed(1)),
    };
  } catch (err) {
    logger.error('getGoalStats failed', { error: (err as Error).message });
    throw err;
  }
}
