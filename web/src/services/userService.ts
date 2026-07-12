// src/services/userService.ts
// All DB queries related to users. Uses parameterized queries only — no raw string interpolation.

import pool from '@/config/db';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import type { UserRole } from '@/lib/auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface DBUser extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  department_id: number | null;
  status: string;
  esg_points_balance: number;
  total_xp: number;
  avatar_url: string | null;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department_id: number | null;
  status: string;
  esg_points_balance: number;
  total_xp: number;
  avatar_url: string | null;
}

const BCRYPT_ROUNDS = 12;

/**
 * Find a user by email address.
 */
export async function findUserByEmail(email: string): Promise<DBUser | null> {
  try {
    const [rows] = await pool.execute<DBUser[]>(
      'SELECT * FROM users WHERE email = ? AND status = ? LIMIT 1',
      [email.toLowerCase().trim(), 'active'],
    );
    return rows[0] ?? null;
  } catch (err) {
    logger.error('findUserByEmail failed', { error: (err as Error).message });
    throw err;
  }
}

/**
 * Find a user by ID.
 */
export async function findUserById(id: number): Promise<PublicUser | null> {
  try {
    const [rows] = await pool.execute<DBUser[]>(
      'SELECT id, name, email, role, department_id, status, esg_points_balance, total_xp, avatar_url FROM users WHERE id = ? AND status = ? LIMIT 1',
      [id, 'active'],
    );
    return rows[0] ?? null;
  } catch (err) {
    logger.error('findUserById failed', { error: (err as Error).message, userId: id });
    throw err;
  }
}

/**
 * Create a new user with hashed password.
 * New sign-ups are always assigned 'employee' role for security.
 */
export async function createUser(params: {
  name: string;
  email: string;
  password: string;
}): Promise<PublicUser> {
  const { name, email, password } = params;

  // Check if email already exists
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'employee', 'active')`,
      [name.trim(), email.toLowerCase().trim(), passwordHash],
    );

    const userId = result.insertId;
    logger.info('New user created', { userId, email: email.toLowerCase().trim() });

    const newUser = await findUserById(userId);
    if (!newUser) throw new Error('USER_CREATION_FAILED');
    return newUser;
  } catch (err) {
    if ((err as Error).message === 'EMAIL_ALREADY_EXISTS') throw err;
    logger.error('createUser failed', { error: (err as Error).message });
    throw err;
  }
}

/**
 * Verify password against stored hash.
 */
export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Update last login timestamp.
 */
export async function updateLastLogin(userId: number): Promise<void> {
  try {
    await pool.execute(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [userId],
    );
  } catch (err) {
    logger.warn('updateLastLogin failed', { error: (err as Error).message, userId });
  }
}
