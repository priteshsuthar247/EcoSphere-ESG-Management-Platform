// src/app/api/gamification/challenges/route.ts
// GET /api/gamification/challenges - Get challenges list
// POST /api/gamification/challenges - Create a new challenge (Admin only)
// PUT /api/gamification/challenges - Update a challenge (Admin only)

import { NextRequest } from 'next/server';
import pool from '@/config/db';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '@/lib/logger';

interface ChallengeDetail extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  xp_reward: number;
  difficulty: string;
  evidence_required: number;
  start_date: string | null;
  end_date: string;
  status: string;
  max_participants: number | null;
}

function isAdmin(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  return payload?.role === 'admin';
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

    const [rows] = await pool.execute<ChallengeDetail[]>(`
      SELECT 
        c.id, 
        c.title, 
        c.description, 
        c.category_id, 
        cat.name AS category_name, 
        c.xp_reward, 
        c.difficulty, 
        c.evidence_required, 
        c.start_date, 
        c.end_date, 
        c.status, 
        c.max_participants
      FROM challenges c
      LEFT JOIN categories cat ON cat.id = c.category_id
      ORDER BY c.id DESC
    `);

    return successResponse(rows, 'Challenges retrieved successfully');
  } catch (err) {
    logger.error('GET /api/gamification/challenges error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return errorResponse('Access denied. Admin role required.', 403, 'UNAUTHORIZED');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid payload', 400);
    }

    const { title, description, categoryId, xpReward, difficulty, evidenceRequired, startDate, endDate, status, maxParticipants } = body as Record<string, unknown>;

    if (typeof title !== 'string' || title.trim().length < 2) {
      return errorResponse('Valid title is required', 400, 'VALIDATION_ERROR');
    }
    if (typeof endDate !== 'string' || !endDate) {
      return errorResponse('Valid end date is required', 400, 'VALIDATION_ERROR');
    }

    const finalCategoryId = typeof categoryId === 'number' ? categoryId : null;
    const finalXpReward = typeof xpReward === 'number' ? xpReward : 100;
    const finalDifficulty = typeof difficulty === 'string' && ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    const finalEvidenceRequired = evidenceRequired ? 1 : 0;
    const finalStartDate = typeof startDate === 'string' && startDate ? startDate : null;
    const finalStatus = typeof status === 'string' && ['draft', 'active', 'under_review', 'completed', 'archived'].includes(status) ? status : 'draft';
    const finalMaxParticipants = typeof maxParticipants === 'number' ? maxParticipants : null;

    const token = request.cookies.get('auth-token')?.value;
    const payload = verifyToken(token!);
    const creatorUserId = payload?.id || 1;

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO challenges (title, description, category_id, xp_reward, difficulty, evidence_required, start_date, end_date, status, max_participants, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        typeof description === 'string' ? description.trim() : null,
        finalCategoryId,
        finalXpReward,
        finalDifficulty,
        finalEvidenceRequired,
        finalStartDate,
        endDate,
        finalStatus,
        finalMaxParticipants,
        creatorUserId
      ]
    );

    logger.info('Created challenge', { challengeId: result.insertId, title });
    return successResponse({ id: result.insertId }, 'Challenge created successfully', 201);
  } catch (err) {
    logger.error('POST /api/gamification/challenges error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return errorResponse('Access denied. Admin role required.', 403, 'UNAUTHORIZED');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid payload', 400);
    }

    const { id, title, description, categoryId, xpReward, difficulty, evidenceRequired, startDate, endDate, status, maxParticipants } = body as Record<string, unknown>;

    if (typeof id !== 'number') {
      return errorResponse('Valid challenge ID is required', 400, 'VALIDATION_ERROR');
    }
    if (typeof title !== 'string' || title.trim().length < 2) {
      return errorResponse('Valid title is required', 400, 'VALIDATION_ERROR');
    }
    if (typeof endDate !== 'string' || !endDate) {
      return errorResponse('Valid end date is required', 400, 'VALIDATION_ERROR');
    }

    const finalCategoryId = typeof categoryId === 'number' ? categoryId : null;
    const finalXpReward = typeof xpReward === 'number' ? xpReward : 100;
    const finalDifficulty = typeof difficulty === 'string' && ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    const finalEvidenceRequired = evidenceRequired ? 1 : 0;
    const finalStartDate = typeof startDate === 'string' && startDate ? startDate : null;
    const finalStatus = typeof status === 'string' && ['draft', 'active', 'under_review', 'completed', 'archived'].includes(status) ? status : 'draft';
    const finalMaxParticipants = typeof maxParticipants === 'number' ? maxParticipants : null;

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE challenges 
       SET title = ?, description = ?, category_id = ?, xp_reward = ?, difficulty = ?, evidence_required = ?, start_date = ?, end_date = ?, status = ?, max_participants = ?
       WHERE id = ?`,
      [
        title.trim(),
        typeof description === 'string' ? description.trim() : null,
        finalCategoryId,
        finalXpReward,
        finalDifficulty,
        finalEvidenceRequired,
        finalStartDate,
        endDate,
        finalStatus,
        finalMaxParticipants,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Challenge not found', 404, 'NOT_FOUND');
    }

    logger.info('Updated challenge details', { challengeId: id, title });
    return successResponse(null, 'Challenge updated successfully');
  } catch (err) {
    logger.error('PUT /api/gamification/challenges error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
