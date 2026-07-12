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

    // 1. Fetch employee standings ordered by total XP
    const [employees] = await pool.execute<EmployeeRankRow[]>(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        d.name AS department_name, 
        u.total_xp, 
        u.esg_points_balance
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.status = 'active'
      ORDER BY u.total_xp DESC, u.esg_points_balance DESC
    `);

    // 2. Fetch department standings ordered by current ESG total score
    const [departments] = await pool.execute<DepartmentRankRow[]>(`
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
      WHERE d.status = 'active'
      ORDER BY total_score DESC, d.name ASC
    `);

    return successResponse({ employees, departments }, 'Leaderboard rankings retrieved successfully');
  } catch (err) {
    logger.error('GET /api/gamification/leaderboard error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
