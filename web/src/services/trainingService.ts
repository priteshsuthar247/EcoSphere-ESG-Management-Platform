// Employee training completion records

import pool from "@/config/db";
import logger from "@/lib/logger";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export interface TrainingRow extends RowDataPacket {
  id: number;
  user_id: number;
  user_name: string;
  department_name: string | null;
  training_name: string;
  category: string | null;
  completion_date: string;
  hours: number | null;
  certificate_url: string | null;
  created_at: string;
}

export async function listTrainings(options?: {
  userId?: number;
  departmentId?: number | null;
}): Promise<TrainingRow[]> {
  const clauses: string[] = [];
  const params: Array<string | number | null> = [];
  if (options?.userId != null) {
    clauses.push("t.user_id = ?");
    params.push(options.userId);
  }
  if (options?.departmentId != null) {
    clauses.push("u.department_id = ?");
    params.push(options.departmentId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = await pool.execute<TrainingRow[]>(
    `SELECT t.id, t.user_id, u.name AS user_name, d.name AS department_name,
            t.training_name, t.category, t.completion_date, t.hours,
            t.certificate_url, t.created_at
     FROM employee_trainings t
     JOIN users u ON u.id = t.user_id
     LEFT JOIN departments d ON d.id = u.department_id
     ${where}
     ORDER BY t.completion_date DESC, t.id DESC`,
    params,
  );
  return rows.map((r) => ({
    ...r,
    hours: r.hours == null ? null : Number(r.hours),
  }));
}

export async function createTraining(input: {
  user_id: number;
  training_name: string;
  category?: string | null;
  completion_date: string;
  hours?: number | null;
  certificate_url?: string | null;
}): Promise<TrainingRow> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO employee_trainings
       (user_id, training_name, category, completion_date, hours, certificate_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.user_id,
      input.training_name.trim(),
      input.category?.trim() || null,
      input.completion_date,
      input.hours ?? null,
      input.certificate_url?.trim() || null,
    ],
  );
  const rows = await listTrainings({ userId: input.user_id });
  const created = rows.find((r) => r.id === result.insertId);
  if (!created) throw new Error("TRAINING_CREATE_FAILED");
  logger.info("Training recorded", { id: created.id, userId: input.user_id });
  return created;
}

export async function getTrainingStats(options?: {
  departmentId?: number | null;
}): Promise<{ total: number; employees_trained: number; total_hours: number }> {
  const clauses: string[] = [];
  const params: Array<string | number | null> = [];
  if (options?.departmentId != null) {
    clauses.push("u.department_id = ?");
    params.push(options.departmentId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total,
            COUNT(DISTINCT t.user_id) AS employees_trained,
            COALESCE(SUM(t.hours), 0) AS total_hours
     FROM employee_trainings t
     JOIN users u ON u.id = t.user_id
     ${where}`,
    params,
  );
  return {
    total: Number(rows[0]?.total ?? 0),
    employees_trained: Number(rows[0]?.employees_trained ?? 0),
    total_hours: Number(rows[0]?.total_hours ?? 0),
  };
}
