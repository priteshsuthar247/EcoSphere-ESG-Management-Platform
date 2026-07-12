// src/services/categoryService.ts
// Shared category lookups (CSR, challenges, ESG).

import pool from '@/config/db';
import logger from '@/lib/logger';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type CategoryType = 'csr_activity' | 'challenge' | 'esg_category';
export type EntityStatus = 'active' | 'inactive' | 'draft' | 'archived';

export interface Category extends RowDataPacket {
  id: number;
  name: string;
  type: CategoryType;
  description: string | null;
  status: EntityStatus;
  created_at: string;
}

export async function listCategories(options?: {
  type?: CategoryType;
  status?: EntityStatus | 'all';
  search?: string;
}): Promise<Category[]> {
  try {
    const clauses: string[] = [];
    const params: Array<string | number | boolean | null> = [];

    if (options?.type) {
      clauses.push('type = ?');
      params.push(options.type);
    }
    if (options?.status && options.status !== 'all') {
      clauses.push('status = ?');
      params.push(options.status);
    }
    if (options?.search?.trim()) {
      const q = `%${options.search.trim().replace(/[%_]/g, '\\$&')}%`;
      clauses.push(
        '(name LIKE ? OR type LIKE ? OR description LIKE ? OR CAST(id AS CHAR) LIKE ?)',
      );
      params.push(q, q, q, q);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute<Category[]>(
      `SELECT id, name, type, description, status, created_at
       FROM categories
       ${where}
       ORDER BY name ASC`,
      params,
    );
    return rows;
  } catch (err) {
    logger.error('listCategories failed', { error: (err as Error).message });
    throw err;
  }
}

export async function createCategory(input: {
  name: string;
  type: CategoryType;
  description?: string | null;
  status?: EntityStatus;
}): Promise<Category> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO categories (name, type, description, status)
       VALUES (?, ?, ?, ?)`,
      [
        input.name.trim(),
        input.type,
        input.description?.trim() || null,
        input.status ?? 'active',
      ],
    );

    const [rows] = await pool.execute<Category[]>(
      `SELECT id, name, type, description, status, created_at
       FROM categories WHERE id = ? LIMIT 1`,
      [result.insertId],
    );
    const created = rows[0];
    if (!created) throw new Error('CATEGORY_CREATE_FAILED');
    logger.info('Category created', { id: created.id, type: created.type });
    return created;
  } catch (err) {
    logger.error('createCategory failed', { error: (err as Error).message });
    throw err;
  }
}
