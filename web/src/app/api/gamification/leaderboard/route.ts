// src/app/api/gamification/leaderboard/route.ts
// GET /api/gamification/leaderboard - Retrieve rankings for employees and departments

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';
import logger from '@/lib/logger';

interface EmployeeRankRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  department_name: string | null;
  total_xp: number;
  esg_points_balance: number;
}

interface DepartmentRankRow extends RowDataPacket {
  id: number;
  name: string;
  code: string;
  total_score: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return errorResponse('Access denied. Authorization required.', 401, 'UNAUTHORIZED');
    }

    const payload = verifyToken(token);
    if (!payload) {
      return errorResponse('Access denied. Invalid token.', 401, 'UNAUTHORIZED');
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();

    // 1. Fetch employee standings ordered by total XP
    const empClauses = [`u.status = 'active'`];
    const empParams: Array<string | number> = [];
    if (search) {
      const q = `%${search.replace(/[%_]/g, '\\$&')}%`;
      empClauses.push(
        '(u.name LIKE ? OR u.email LIKE ? OR d.name LIKE ? OR CAST(u.id AS CHAR) LIKE ?)',
      );
      empParams.push(q, q, q, q);
    }
    const [employees] = await pool.execute<EmployeeRankRow[]>(
      `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        d.name AS department_name, 
        u.total_xp, 
        u.esg_points_balance
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE ${empClauses.join(' AND ')}
      ORDER BY u.total_xp DESC, u.esg_points_balance DESC
    `,
      empParams,
    );

    // 2. Fetch department standings ordered by current ESG total score
    const deptClauses = [`d.status = 'active'`];
    const deptParams: Array<string | number> = [];
    if (search) {
      const q = `%${search.replace(/[%_]/g, '\\$&')}%`;
      deptClauses.push('(d.name LIKE ? OR d.code LIKE ? OR CAST(d.id AS CHAR) LIKE ?)');
      deptParams.push(q, q, q);
    }
    const [departments] = await pool.execute<DepartmentRankRow[]>(
      `
      SELECT 
        d.id, 
        d.name, 
        d.code,
        COALESCE(s.total_score, 0.00) AS total_score,
        COALESCE(s.environmental_score, 0.00) AS environmental_score,
        COALESCE(s.social_score, 0.00) AS social_score,
        COALESCE(s.governance_score, 0.00) AS governance_score
      FROM departments d
      LEFT JOIN department_esg_scores s ON s.department_id = d.id 
        AND s.as_of_date = (SELECT MAX(as_of_date) FROM department_esg_scores)
      WHERE ${deptClauses.join(' AND ')}
      ORDER BY total_score DESC, d.name ASC
    `,
      deptParams,
    );

    return successResponse({ employees, departments }, 'Leaderboard rankings retrieved successfully');
  } catch (err) {
    logger.error('GET /api/gamification/leaderboard error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
