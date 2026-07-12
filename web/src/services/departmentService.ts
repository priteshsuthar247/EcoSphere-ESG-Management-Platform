// src/services/departmentService.ts
// Shared department lookups for environmental modules.

import pool from '@/config/db';
import logger from '@/lib/logger';
import type { RowDataPacket } from 'mysql2';

export interface DepartmentOption extends RowDataPacket {
  id: number;
  name: string;
  code: string;
  status: string;
}

export async function listActiveDepartments(): Promise<DepartmentOption[]> {
  try {
    const [rows] = await pool.execute<DepartmentOption[]>(
      `SELECT id, name, code, status
       FROM departments
       WHERE status = 'active'
       ORDER BY name ASC`,
    );
    return rows;
  } catch (err) {
    logger.error('listActiveDepartments failed', { error: (err as Error).message });
    throw err;
  }
}
