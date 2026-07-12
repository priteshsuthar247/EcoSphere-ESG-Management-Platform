// src/services/badgeService.ts
// Badge auto-award when ESG points balance meets unlock thresholds.
// Tier ladder (lowest → highest): Bronze 1k → Silver 3k → Gold 5k → Platinum 8k → Diamond 12k

import pool from '@/config/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '@/lib/logger';

interface UserPointsRow extends RowDataPacket {
  name: string;
  email: string;
  esg_points_balance: number | string;
  total_xp?: number | string;
}

interface BadgeRow extends RowDataPacket {
  id: number;
  name: string;
  unlock_rule: { points_required?: number } | string;
}

function parseUnlockRule(raw: BadgeRow['unlock_rule']): {
  points_required?: number;
  completed_challenges?: number;
  min_xp?: number;
} {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw as {
    points_required?: number;
    completed_challenges?: number;
    min_xp?: number;
  };
}

/**
 * Award every active badge whose points_required the user currently meets.
 * Safe to call repeatedly (INSERT IGNORE / already-owned check).
 * Returns number of newly awarded badges.
 * Respects Settings → ESG Configuration → Auto-award badges (unless force=true).
 */
export async function awardEligibleBadges(
  userId: number,
  options?: { force?: boolean },
): Promise<number> {
  try {
    if (!options?.force) {
      const { getEsgConfig } = await import('@/services/systemConfig');
      const esg = await getEsgConfig();
      if (!esg.autoAwardBadges) {
        logger.info('Badge auto-award skipped (disabled in ESG config)', { userId });
        return 0;
      }
    }

    const [userRows] = await pool.execute<UserPointsRow[]>(
      'SELECT name, email, esg_points_balance, total_xp FROM users WHERE id = ? AND status = ? LIMIT 1',
      [userId, 'active'],
    );
    const user = userRows[0] as UserPointsRow & { total_xp?: number | string };
    if (!user) return 0;

    // MySQL DECIMAL can arrive as string — always coerce
    const balance = Number(user.esg_points_balance);
    const totalXp = Number(user.total_xp ?? 0);
    if (!Number.isFinite(balance)) {
      logger.warn('awardEligibleBadges: invalid points balance', { userId, raw: user.esg_points_balance });
      return 0;
    }

    const [completedRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM challenge_participations
       WHERE user_id = ? AND approval_status = 'approved'`,
      [userId],
    );
    const completedChallenges = Number(completedRows[0]?.cnt ?? 0);

    const [badges] = await pool.execute<BadgeRow[]>(
      `SELECT id, name, unlock_rule FROM badges WHERE status = 'active' ORDER BY id ASC`,
    );

    const [awardedRows] = await pool.execute<RowDataPacket[]>(
      'SELECT badge_id FROM user_badges WHERE user_id = ?',
      [userId],
    );
    const awardedBadgeIds = new Set(awardedRows.map((row) => Number(row.badge_id)));

    let newlyAwarded = 0;

    for (const badge of badges) {
      if (awardedBadgeIds.has(Number(badge.id))) continue;

      const rule = parseUnlockRule(badge.unlock_rule);
      const pointsRequired = Number(rule.points_required);
      const challengesRequired = Number(rule.completed_challenges);
      const minXp = Number(rule.min_xp);

      // Every threshold present in the unlock rule must be met (AND)
      let hasRule = false;
      let qualifies = true;
      if (Number.isFinite(pointsRequired) && pointsRequired >= 0) {
        hasRule = true;
        qualifies = qualifies && balance >= pointsRequired;
      }
      if (Number.isFinite(challengesRequired) && challengesRequired > 0) {
        hasRule = true;
        qualifies = qualifies && completedChallenges >= challengesRequired;
      }
      if (Number.isFinite(minXp) && minXp > 0) {
        hasRule = true;
        qualifies = qualifies && totalXp >= minXp;
      }
      if (!hasRule || !qualifies) continue;

      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT IGNORE INTO user_badges (user_id, badge_id, awarded_reason)
         VALUES (?, ?, ?)`,
        [
          userId,
          badge.id,
          `Unlocked (points=${balance}, challenges=${completedChallenges}, xp=${totalXp}). Rule: ${JSON.stringify(rule)}.`,
        ],
      );

      if (result.affectedRows === 0) continue;

      newlyAwarded++;
      awardedBadgeIds.add(Number(badge.id));

      logger.info('User unlocked badge', {
        userId,
        badgeId: badge.id,
        badgeName: badge.name,
        balance,
        pointsRequired,
      });

      const { notifyUser } = await import('@/services/notificationService');
      const { escapeHtml } = await import('@/lib/htmlEscape');
      await notifyUser({
        userId,
        type: 'badge_unlocked',
        title: 'Badge Unlocked!',
        message: `Congratulations! You have unlocked the ${badge.name}.`,
        actionUrl: '/dashboard/gamification/badges',
        relatedEntityType: 'badge',
        relatedEntityId: Number(badge.id),
        emailSubject: `Achievement Unlocked: ${badge.name}!`,
        emailHtml: `
          <div style="font-family:sans-serif;padding:16px">
            <h2>Badge unlocked</h2>
            <p>Hi ${escapeHtml(user.name)}, you unlocked <strong>${escapeHtml(badge.name)}</strong>
            with ${escapeHtml(balance)} ESG points.</p>
          </div>`,
      });
    }

    return newlyAwarded;
  } catch (err) {
    logger.error('awardEligibleBadges error', {
      error: (err as Error).message,
      userId,
    });
    return 0;
  }
}

/**
 * Re-evaluate badges for every active user. Used by admin POST /api/gamification/badges.
 */
export async function reevaluateAllBadges(): Promise<number> {
  const [users] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM users WHERE status = 'active'`,
  );

  let total = 0;
  for (const user of users) {
    // Admin re-eval runs even when auto-award toggle is off
    total += await awardEligibleBadges(Number(user.id), { force: true });
  }
  logger.info('Completed system-wide badge re-evaluation', { awardedCount: total });
  return total;
}
