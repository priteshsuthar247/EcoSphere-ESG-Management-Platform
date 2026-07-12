// src/services/reportService.ts
// Reporting data access layer.
// Centralizes all database column and table references in a DB_MAP mapping configuration
// to allow easy adaptions if other developers change column naming in their modules.

import pool from '@/config/db';
import type { RowDataPacket } from 'mysql2';
import logger from '@/lib/logger';

// ============================================================================
// CENTRALIZED DATABASE TABLE AND COLUMN SCHEMA MAP
// If columns are renamed or modified, edit this mapping block:
// ============================================================================
export const DB_MAP = {
  // Environmental data mapping
  carbon: {
    table: 'carbon_transactions',
    cols: {
      id: 'id',
      date: 'transaction_date',
      source_type: 'source_type',
      calculated_emissions: 'calculated_emissions_kgco2e',
      scope: 'scope',
      department_id: 'department_id',
      created_by: 'created_by'
    }
  },
  // Social data mapping
  csr: {
    table: 'employee_csr_participations',
    cols: {
      id: 'id',
      user_id: 'user_id',
      activity_id: 'csr_activity_id',
      points_earned: 'points_earned',
      date: 'completion_date',
      status: 'approval_status'
    },
    activities_table: 'csr_activities',
    activities_cols: {
      title: 'title',
      points_awarded: 'points_awarded'
    }
  },
  // Governance data mapping
  compliance: {
    table: 'compliance_issues',
    cols: {
      id: 'id',
      title: 'title',
      severity: 'severity',
      status: 'status',
      dept_id: 'department_id',
      owner_id: 'owner_user_id',
      date: 'due_date'
    }
  }
};

export interface ESGSummaryResult {
  emissions: {
    scope1: number;
    scope2: number;
    scope3: number;
    total: number;
  };
  social: {
    active_volunteers: number;
    csr_points_allocated: number;
    csr_activities_completed: number;
  };
  governance: {
    open_issues: number;
    critical_issues: number;
    resolved_issues: number;
  };
}

export interface CustomReportRow {
  id: number;
  date: string;
  module: string;
  department_name: string | null;
  employee_name: string | null;
  metric_name: string;
  metric_value: string;
}

/** Normalize MySQL DATE / DATETIME / Date / string into YYYY-MM-DD (or en-dash). */
function formatReportDate(value: unknown): string {
  if (value == null || value === '') return '–';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '–';
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return s;
}

/**
 * Generates aggregated ESG Summary statistics.
 */
export async function getESGSummaryStats(): Promise<ESGSummaryResult> {
  const c = DB_MAP.carbon;
  const s = DB_MAP.csr;
  const g = DB_MAP.compliance;

  try {
    // 1. Fetch Carbon emissions grouped by Scope
    const [carbonRows] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        COALESCE(SUM(CASE WHEN ${c.cols.scope} = '1' THEN ${c.cols.calculated_emissions} ELSE 0 END), 0.0) AS s1,
        COALESCE(SUM(CASE WHEN ${c.cols.scope} = '2' THEN ${c.cols.calculated_emissions} ELSE 0 END), 0.0) AS s2,
        COALESCE(SUM(CASE WHEN ${c.cols.scope} = '3' THEN ${c.cols.calculated_emissions} ELSE 0 END), 0.0) AS s3
      FROM ${c.table}
    `);
    
    const carbonData = carbonRows[0] || { s1: 0, s2: 0, s3: 0 };
    const scope1 = Number(carbonData.s1);
    const scope2 = Number(carbonData.s2);
    const scope3 = Number(carbonData.s3);

    // 2. Fetch CSR metrics
    const [csrRows] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        COUNT(DISTINCT ${s.cols.user_id}) AS volunteers,
        COALESCE(SUM(${s.cols.points_earned}), 0) AS total_points,
        COUNT(*) AS total_activities
      FROM ${s.table}
      WHERE ${s.cols.status} = 'approved'
    `);
    const csrData = csrRows[0] || { volunteers: 0, total_points: 0, total_activities: 0 };

    // 3. Fetch compliance metrics
    const [govRows] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        COALESCE(SUM(CASE WHEN ${g.cols.status} IN ('open', 'in_progress') THEN 1 ELSE 0 END), 0) AS open_count,
        COALESCE(SUM(CASE WHEN ${g.cols.status} IN ('open', 'in_progress') AND ${g.cols.severity} = 'critical' THEN 1 ELSE 0 END), 0) AS critical_count,
        COALESCE(SUM(CASE WHEN ${g.cols.status} = 'resolved' THEN 1 ELSE 0 END), 0) AS resolved_count
      FROM ${g.table}
    `);
    const govData = govRows[0] || { open_count: 0, critical_count: 0, resolved_count: 0 };

    return {
      emissions: {
        scope1,
        scope2,
        scope3,
        total: scope1 + scope2 + scope3
      },
      social: {
        active_volunteers: Number(csrData.volunteers),
        csr_points_allocated: Number(csrData.total_points),
        csr_activities_completed: Number(csrData.total_activities)
      },
      governance: {
        open_issues: Number(govData.open_count),
        critical_issues: Number(govData.critical_count),
        resolved_issues: Number(govData.resolved_count)
      }
    };
  } catch (err) {
    logger.error('getESGSummaryStats failed', { error: (err as Error).message });
    throw err;
  }
}

/**
 * Builds a dynamic, filtered report combining ESG module rows.
 */
export async function buildCustomReport(filters: {
  module?: 'environmental' | 'social' | 'governance' | 'all';
  departmentId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  employeeId?: number | null;
  challengeId?: number | null;
  categoryId?: number | null;
}): Promise<CustomReportRow[]> {
  const c = DB_MAP.carbon;
  const s = DB_MAP.csr;
  const g = DB_MAP.compliance;

  const results: CustomReportRow[] = [];
  const activeModule = filters.module || 'all';

  try {
    // ── MODULE 1: ENVIRONMENTAL (Carbon Transactions) ──
    if (activeModule === 'all' || activeModule === 'environmental') {
      let query = `
        SELECT 
          c.${c.cols.id} AS id,
          c.${c.cols.date} AS date,
          d.name AS department_name,
          u.name AS employee_name,
          CONCAT('Scope ', c.${c.cols.scope}, ' - ', c.${c.cols.source_type}) AS metric_name,
          CONCAT(c.${c.cols.calculated_emissions}, ' kgCO2e') AS metric_value
        FROM ${c.table} c
        LEFT JOIN departments d ON d.id = c.${c.cols.department_id}
        LEFT JOIN users u ON u.id = c.${c.cols.created_by}
      `;
      
      const wheres: string[] = [];
      const values: (string | number | boolean | Date | null)[] = [];

      if (filters.departmentId) {
        wheres.push(`c.${c.cols.department_id} = ?`);
        values.push(filters.departmentId);
      }
      if (filters.startDate) {
        wheres.push(`c.${c.cols.date} >= ?`);
        values.push(filters.startDate);
      }
      if (filters.endDate) {
        wheres.push(`c.${c.cols.date} <= ?`);
        values.push(filters.endDate);
      }
      if (filters.employeeId) {
        wheres.push(`c.${c.cols.created_by} = ?`);
        values.push(filters.employeeId);
      }

      if (wheres.length > 0) {
        query += ` WHERE ${wheres.join(' AND ')}`;
      }

      query += ` ORDER BY c.${c.cols.date} DESC`;

      const [rows] = await pool.execute<RowDataPacket[]>(query, values);
      rows.forEach((r) => {
        results.push({
          id: r.id,
          date: formatReportDate(r.date),
          module: 'Environmental',
          department_name: r.department_name,
          employee_name: r.employee_name,
          metric_name: r.metric_name,
          metric_value: r.metric_value
        });
      });
    }

    // ── MODULE 2: SOCIAL (CSR Participations) ──
    if (activeModule === 'all' || activeModule === 'social') {
      let query = `
        SELECT 
          p.${s.cols.id} AS id,
          p.${s.cols.date} AS date,
          d.name AS department_name,
          u.name AS employee_name,
          CONCAT('CSR: ', act.${s.activities_cols.title}) AS metric_name,
          CONCAT('+', p.${s.cols.points_earned}, ' points (', p.${s.cols.status}, ')') AS metric_value
        FROM ${s.table} p
        JOIN users u ON u.id = p.${s.cols.user_id}
        JOIN ${s.activities_table} act ON act.id = p.${s.cols.activity_id}
        LEFT JOIN departments d ON d.id = u.department_id
      `;

      const wheres: string[] = [];
      const values: (string | number | boolean | Date | null)[] = [];

      if (filters.departmentId) {
        wheres.push(`u.department_id = ?`);
        values.push(filters.departmentId);
      }
      if (filters.startDate) {
        wheres.push(`p.${s.cols.date} >= ?`);
        values.push(filters.startDate);
      }
      if (filters.endDate) {
        wheres.push(`p.${s.cols.date} <= ?`);
        values.push(filters.endDate);
      }
      if (filters.employeeId) {
        wheres.push(`p.${s.cols.user_id} = ?`);
        values.push(filters.employeeId);
      }
      if (filters.categoryId) {
        wheres.push(`act.category_id = ?`);
        values.push(filters.categoryId);
      }

      if (wheres.length > 0) {
        query += ` WHERE ${wheres.join(' AND ')}`;
      }

      query += ` ORDER BY p.${s.cols.date} DESC`;

      const [rows] = await pool.execute<RowDataPacket[]>(query, values);
      rows.forEach((r) => {
        results.push({
          id: r.id,
          date: formatReportDate(r.date),
          module: 'Social',
          department_name: r.department_name,
          employee_name: r.employee_name,
          metric_name: r.metric_name,
          metric_value: r.metric_value
        });
      });

      // Challenge participations (also under social / gamification activity)
      let chQuery = `
        SELECT
          cp.id AS id,
          COALESCE(cp.completed_at, cp.joined_at) AS date,
          d.name AS department_name,
          u.name AS employee_name,
          CONCAT('Challenge: ', c.title) AS metric_name,
          CONCAT(cp.approval_status, ' · XP ', COALESCE(cp.xp_awarded, 0)) AS metric_value
        FROM challenge_participations cp
        JOIN challenges c ON c.id = cp.challenge_id
        JOIN users u ON u.id = cp.user_id
        LEFT JOIN departments d ON d.id = u.department_id
      `;
      const chWheres: string[] = [];
      const chValues: (string | number | boolean | Date | null)[] = [];
      if (filters.departmentId) {
        chWheres.push(`u.department_id = ?`);
        chValues.push(filters.departmentId);
      }
      if (filters.employeeId) {
        chWheres.push(`cp.user_id = ?`);
        chValues.push(filters.employeeId);
      }
      if (filters.challengeId) {
        chWheres.push(`cp.challenge_id = ?`);
        chValues.push(filters.challengeId);
      }
      if (filters.categoryId) {
        chWheres.push(`c.category_id = ?`);
        chValues.push(filters.categoryId);
      }
      if (filters.startDate) {
        chWheres.push(`DATE(COALESCE(cp.completed_at, cp.joined_at)) >= ?`);
        chValues.push(filters.startDate);
      }
      if (filters.endDate) {
        chWheres.push(`DATE(COALESCE(cp.completed_at, cp.joined_at)) <= ?`);
        chValues.push(filters.endDate);
      }
      if (chWheres.length > 0) {
        chQuery += ` WHERE ${chWheres.join(' AND ')}`;
      }
      chQuery += ` ORDER BY date DESC`;
      const [chRows] = await pool.execute<RowDataPacket[]>(chQuery, chValues);
      chRows.forEach((r) => {
        results.push({
          id: r.id,
          date: formatReportDate(r.date),
          module: 'Social',
          department_name: r.department_name,
          employee_name: r.employee_name,
          metric_name: r.metric_name,
          metric_value: r.metric_value,
        });
      });
    }

    // ── MODULE 3: GOVERNANCE (Compliance Issues) ──
    if (activeModule === 'all' || activeModule === 'governance') {
      let query = `
        SELECT 
          g.${g.cols.id} AS id,
          g.${g.cols.date} AS date,
          d.name AS department_name,
          u.name AS employee_name,
          CONCAT('Compliance: ', g.${g.cols.title}) AS metric_name,
          CONCAT('Severity: ', UPPER(g.${g.cols.severity}), ' (Status: ', g.${g.cols.status}, ')') AS metric_value
        FROM ${g.table} g
        LEFT JOIN departments d ON d.id = g.${g.cols.dept_id}
        LEFT JOIN users u ON u.id = g.${g.cols.owner_id}
      `;

      const wheres: string[] = [];
      const values: (string | number | boolean | Date | null)[] = [];

      if (filters.departmentId) {
        wheres.push(`g.${g.cols.dept_id} = ?`);
        values.push(filters.departmentId);
      }
      if (filters.startDate) {
        wheres.push(`g.${g.cols.date} >= ?`);
        values.push(filters.startDate);
      }
      if (filters.endDate) {
        wheres.push(`g.${g.cols.date} <= ?`);
        values.push(filters.endDate);
      }
      if (filters.employeeId) {
        wheres.push(`g.${g.cols.owner_id} = ?`);
        values.push(filters.employeeId);
      }

      if (wheres.length > 0) {
        query += ` WHERE ${wheres.join(' AND ')}`;
      }

      query += ` ORDER BY g.${g.cols.date} DESC`;

      const [rows] = await pool.execute<RowDataPacket[]>(query, values);
      rows.forEach((r) => {
        results.push({
          id: r.id,
          date: formatReportDate(r.date),
          module: 'Governance',
          department_name: r.department_name,
          employee_name: r.employee_name,
          metric_name: r.metric_name,
          metric_value: r.metric_value
        });
      });
    }

    // Sort all records chronologically by date descending (invalid dates last)
    results.sort((a, b) => {
      const ta = a.date === '–' ? 0 : new Date(a.date).getTime();
      const tb = b.date === '–' ? 0 : new Date(b.date).getTime();
      return tb - ta;
    });
    return results;
  } catch (err) {
    logger.error('buildCustomReport failed', { error: (err as Error).message });
    throw err;
  }
}
