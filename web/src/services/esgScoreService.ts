// Live department ESG scoring engine
// Environmental 40% / Social 30% / Governance 30% (configurable via esg_config weights)

import pool from "@/config/db";
import logger from "@/lib/logger";
import { getEsgConfig } from "@/services/systemConfig";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export type DepartmentScoreRow = {
  department_id: number;
  department_name: string;
  environmental_score: number;
  social_score: number;
  governance_score: number;
  total_score: number;
  rank: number;
  as_of_date: string;
};

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

/**
 * Recompute pillar scores per active department from live operational data,
 * apply configurable weights, persist to department_esg_scores.
 */
export async function recalculateDepartmentEsgScores(
  asOfDate?: string,
): Promise<DepartmentScoreRow[]> {
  const date = asOfDate || new Date().toISOString().slice(0, 10);
  const esg = await getEsgConfig();
  const wE = esg.weightEnvironmental ?? 0.4;
  const wS = esg.weightSocial ?? 0.3;
  const wG = esg.weightGovernance ?? 0.3;
  const wSum = wE + wS + wG || 1;

  const [depts] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name FROM departments WHERE status = 'active' ORDER BY id ASC`,
  );

  // Org-wide baselines for normalization
  const [emMaxRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COALESCE(MAX(dept_em), 1) AS max_em FROM (
       SELECT department_id, SUM(calculated_emissions_kgco2e) AS dept_em
       FROM carbon_transactions
       WHERE department_id IS NOT NULL
       GROUP BY department_id
     ) t`,
  );
  const maxEmissions = Math.max(Number(emMaxRows[0]?.max_em) || 1, 1);

  const results: DepartmentScoreRow[] = [];

  for (const d of depts) {
    const deptId = Number(d.id);

    // Environmental: lower emissions relative to peer max → higher score
    // + boost from active goals progress
    const [emRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(calculated_emissions_kgco2e), 0) AS total_em
       FROM carbon_transactions WHERE department_id = ?`,
      [deptId],
    );
    const totalEm = Number(emRows[0]?.total_em) || 0;
    const emissionScore = 100 * (1 - totalEm / maxEmissions);

    const [goalRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(AVG(
         CASE WHEN target_value = 0 THEN 0
              ELSE LEAST(100, GREATEST(0, (current_value / target_value) * 100))
         END
       ), 50) AS avg_progress
       FROM environmental_goals
       WHERE status IN ('active', 'completed')
         AND (department_id = ? OR department_id IS NULL)`,
      [deptId],
    );
    const goalProgress = Number(goalRows[0]?.avg_progress) || 50;
    const environmental = clampScore(emissionScore * 0.6 + goalProgress * 0.4);

    // Social: CSR approvals + challenge XP in department + headcount engagement
    const [csrRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS approved_cnt
       FROM employee_csr_participations p
       JOIN users u ON u.id = p.user_id
       WHERE p.approval_status = 'approved' AND u.department_id = ?`,
      [deptId],
    );
    const [empRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM users WHERE department_id = ? AND status = 'active'`,
      [deptId],
    );
    const empCount = Math.max(Number(empRows[0]?.cnt) || 1, 1);
    const csrApproved = Number(csrRows[0]?.approved_cnt) || 0;
    const csrRate = Math.min(100, (csrApproved / empCount) * 40);

    const [chRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(cp.xp_awarded), 0) AS xp
       FROM challenge_participations cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.approval_status = 'approved' AND u.department_id = ?`,
      [deptId],
    );
    const xp = Number(chRows[0]?.xp) || 0;
    const xpScore = Math.min(100, xp / 50); // 5000 XP ≈ 100
    const social = clampScore(csrRate * 0.55 + xpScore * 0.45);

    // Governance: policy coverage + inverse of open compliance severity
    const [ackRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM esg_policies WHERE status = 'active' AND requires_acknowledgement = 1) AS need_policies,
         (SELECT COUNT(DISTINCT pa.policy_id)
          FROM policy_acknowledgements pa
          JOIN users u ON u.id = pa.user_id
          JOIN esg_policies p ON p.id = pa.policy_id
          WHERE u.department_id = ? AND p.status = 'active' AND pa.policy_version = p.version) AS acked_policies`,
      [deptId],
    );
    const needP = Math.max(Number(ackRows[0]?.need_policies) || 0, 0);
    const ackedP = Number(ackRows[0]?.acked_policies) || 0;
    const ackScore = needP === 0 ? 80 : Math.min(100, (ackedP / needP) * 100);

    const [compRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         SUM(CASE WHEN status IN ('open','in_progress','overdue') THEN 1 ELSE 0 END) AS open_cnt,
         SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_cnt,
         SUM(CASE WHEN status IN ('open','in_progress','overdue') AND severity = 'critical' THEN 1 ELSE 0 END) AS crit_cnt
       FROM compliance_issues
       WHERE department_id = ?`,
      [deptId],
    );
    const openCnt = Number(compRows[0]?.open_cnt) || 0;
    const resolvedCnt = Number(compRows[0]?.resolved_cnt) || 0;
    const critCnt = Number(compRows[0]?.crit_cnt) || 0;
    const totalIssues = openCnt + resolvedCnt;
    const resolveRate =
      totalIssues === 0 ? 75 : (resolvedCnt / totalIssues) * 100 - critCnt * 8;
    const governance = clampScore(ackScore * 0.45 + Math.max(0, resolveRate) * 0.55);

    const total = clampScore(
      (environmental * wE + social * wS + governance * wG) / wSum,
    );

    results.push({
      department_id: deptId,
      department_name: String(d.name),
      environmental_score: environmental,
      social_score: social,
      governance_score: governance,
      total_score: total,
      rank: 0,
      as_of_date: date,
    });
  }

  results.sort((a, b) => b.total_score - a.total_score);
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  // Persist
  for (const r of results) {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO department_esg_scores
         (department_id, as_of_date, environmental_score, social_score, governance_score, total_score, \`rank\`, calculated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         environmental_score = VALUES(environmental_score),
         social_score = VALUES(social_score),
         governance_score = VALUES(governance_score),
         total_score = VALUES(total_score),
         \`rank\` = VALUES(\`rank\`),
         calculated_at = NOW()`,
      [
        r.department_id,
        date,
        r.environmental_score,
        r.social_score,
        r.governance_score,
        r.total_score,
        r.rank,
      ],
    );
  }

  logger.info("Department ESG scores recalculated", {
    count: results.length,
    date,
    weights: { wE, wS, wG },
  });

  return results;
}

export async function getLatestDepartmentScores(): Promise<DepartmentScoreRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT s.department_id, d.name AS department_name,
            s.environmental_score, s.social_score, s.governance_score, s.total_score,
            s.\`rank\`, s.as_of_date
     FROM department_esg_scores s
     JOIN departments d ON d.id = s.department_id
     WHERE s.as_of_date = (SELECT MAX(as_of_date) FROM department_esg_scores)
     ORDER BY s.total_score DESC`,
  );
  return rows.map((r) => ({
    department_id: Number(r.department_id),
    department_name: String(r.department_name),
    environmental_score: Number(r.environmental_score),
    social_score: Number(r.social_score),
    governance_score: Number(r.governance_score),
    total_score: Number(r.total_score),
    rank: Number(r.rank),
    as_of_date: String(r.as_of_date).slice(0, 10),
  }));
}

export async function getOrgOverallEsgScore(): Promise<{
  environmental: number;
  social: number;
  governance: number;
  overall: number;
  weights: { environmental: number; social: number; governance: number };
}> {
  const esg = await getEsgConfig();
  const wE = esg.weightEnvironmental ?? 0.4;
  const wS = esg.weightSocial ?? 0.3;
  const wG = esg.weightGovernance ?? 0.3;
  const scores = await getLatestDepartmentScores();
  if (scores.length === 0) {
    return {
      environmental: 0,
      social: 0,
      governance: 0,
      overall: 0,
      weights: { environmental: wE, social: wS, governance: wG },
    };
  }
  const avg = (key: keyof DepartmentScoreRow) =>
    scores.reduce((s, r) => s + Number(r[key]), 0) / scores.length;
  const environmental = clampScore(avg("environmental_score"));
  const social = clampScore(avg("social_score"));
  const governance = clampScore(avg("governance_score"));
  const overall = clampScore(
    (environmental * wE + social * wS + governance * wG) / (wE + wS + wG || 1),
  );
  return {
    environmental,
    social,
    governance,
    overall,
    weights: { environmental: wE, social: wS, governance: wG },
  };
}
