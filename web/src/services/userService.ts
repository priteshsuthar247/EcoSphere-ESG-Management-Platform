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

export interface AdminUserListEntry extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department_id: number | null;
  department_name: string | null;
  status: string;
  esg_points_balance: number;
  total_xp: number;
  joined_at: string;
  last_login_at: string | null;
}

/**
 * Get all users with their associated department names.
 */
export async function getAllUsers(): Promise<AdminUserListEntry[]> {
  try {
    const [rows] = await pool.execute<AdminUserListEntry[]>(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.department_id, 
        d.name AS department_name, 
        u.status, 
        u.esg_points_balance, 
        u.total_xp, 
        u.joined_at, 
        u.last_login_at
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      ORDER BY u.id ASC
    `);
    return rows;
  } catch (err) {
    logger.error('getAllUsers failed', { error: (err as Error).message });
    throw err;
  }
}

/**
 * Update a user's role, department, or status by an administrator.
 */
export async function updateUserAdmin(
  userId: number,
  data: {
    role?: UserRole;
    department_id?: number | null;
    status?: 'active' | 'inactive' | 'draft' | 'archived';
  }
): Promise<boolean> {
  try {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.role !== undefined) {
      fields.push('role = ?');
      values.push(data.role);
    }
    if (data.department_id !== undefined) {
      fields.push('department_id = ?');
      values.push(data.department_id);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) return false;

    values.push(userId);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  } catch (err) {
    logger.error('updateUserAdmin failed', { error: (err as Error).message, userId });
    throw err;
  }
}

