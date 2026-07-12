// src/services/diversityService.ts
// Diversity metrics derived from live user / department data.

import pool from '@/config/db';
import logger from '@/lib/logger';
import type { RowDataPacket } from 'mysql2';

export interface DiversitySnapshot {
  totals: {
    active_employees: number;
    total_users: number;
    with_gender: number;
    with_department: number;
    with_dob: number;
  };
  by_gender: { gender: string; count: number; percent: number }[];
  by_role: { role: string; count: number; percent: number }[];
  by_department: {
    department_id: number | null;
    department_name: string;
    count: number;
    percent: number;
  }[];
  by_age_band: { band: string; count: number; percent: number }[];
  gender_by_department: {
    department_name: string;
    gender: string;
    count: number;
  }[];
}

function withPercent<T extends { count: number }>(
  rows: T[],
  total: number,
): (T & { percent: number })[] {
  return rows.map((r) => ({
    ...r,
    percent: total > 0 ? Number(((r.count / total) * 100).toFixed(1)) : 0,
  }));
}

export async function getDiversitySnapshot(): Promise<DiversitySnapshot> {
  try {
    const [totalsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_employees,
         COUNT(*) AS total_users,
         SUM(CASE WHEN gender IS NOT NULL AND TRIM(gender) <> '' THEN 1 ELSE 0 END) AS with_gender,
         SUM(CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END) AS with_department,
         SUM(CASE WHEN date_of_birth IS NOT NULL THEN 1 ELSE 0 END) AS with_dob
       FROM users
       WHERE status = 'active'`,
    );

    const active = Number(totalsRows[0]?.active_employees ?? 0);

    const [genderRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(NULLIF(TRIM(gender), ''), 'unspecified') AS gender,
              COUNT(*) AS count
       FROM users
       WHERE status = 'active'
       GROUP BY COALESCE(NULLIF(TRIM(gender), ''), 'unspecified')
       ORDER BY count DESC`,
    );

    const [roleRows] = await pool.execute<RowDataPacket[]>(
      `SELECT role, COUNT(*) AS count
       FROM users
       WHERE status = 'active'
       GROUP BY role
       ORDER BY count DESC`,
    );

    const [deptRows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.department_id,
              COALESCE(d.name, 'Unassigned') AS department_name,
              COUNT(*) AS count
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.status = 'active'
       GROUP BY u.department_id, d.name
       ORDER BY count DESC`,
    );

    const [ageRows] = await pool.execute<RowDataPacket[]>(
      `SELECT band, COUNT(*) AS count FROM (
         SELECT
           CASE
             WHEN date_of_birth IS NULL THEN 'unknown'
             WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) < 25 THEN 'under_25'
             WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 25 AND 34 THEN '25_34'
             WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 35 AND 44 THEN '35_44'
             WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 45 AND 54 THEN '45_54'
             ELSE '55_plus'
           END AS band
         FROM users
         WHERE status = 'active'
       ) age_data
       GROUP BY band
       ORDER BY FIELD(band, 'under_25', '25_34', '35_44', '45_54', '55_plus', 'unknown')`,
    );

    const [genderDeptRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(d.name, 'Unassigned') AS department_name,
              COALESCE(NULLIF(TRIM(u.gender), ''), 'unspecified') AS gender,
              COUNT(*) AS count
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.status = 'active'
       GROUP BY COALESCE(d.name, 'Unassigned'),
                COALESCE(NULLIF(TRIM(u.gender), ''), 'unspecified')
       ORDER BY department_name, count DESC`,
    );

    return {
      totals: {
        active_employees: active,
        total_users: Number(totalsRows[0]?.total_users ?? 0),
        with_gender: Number(totalsRows[0]?.with_gender ?? 0),
        with_department: Number(totalsRows[0]?.with_department ?? 0),
        with_dob: Number(totalsRows[0]?.with_dob ?? 0),
      },
      by_gender: withPercent(
        genderRows.map((r) => ({ gender: String(r.gender), count: Number(r.count) })),
        active,
      ),
      by_role: withPercent(
        roleRows.map((r) => ({ role: String(r.role), count: Number(r.count) })),
        active,
      ),
      by_department: withPercent(
        deptRows.map((r) => ({
          department_id: r.department_id === null ? null : Number(r.department_id),
          department_name: String(r.department_name),
          count: Number(r.count),
        })),
        active,
      ),
      by_age_band: withPercent(
        ageRows.map((r) => ({ band: String(r.band), count: Number(r.count) })),
        active,
      ),
      gender_by_department: genderDeptRows.map((r) => ({
        department_name: String(r.department_name),
        gender: String(r.gender),
        count: Number(r.count),
      })),
    };
  } catch (err) {
    logger.error('getDiversitySnapshot failed', { error: (err as Error).message });
    throw err;
  }
}
