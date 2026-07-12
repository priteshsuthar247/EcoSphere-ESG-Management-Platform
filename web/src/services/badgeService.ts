// src/services/badgeService.ts
// Badge auto-award when ESG points balance meets unlock thresholds.
// Tier ladder (lowest → highest): Bronze 1k → Silver 3k → Gold 5k → Platinum 8k → Diamond 12k

import pool from '@/config/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import logger from '@/lib/logger';
import { sendMail } from '@/lib/email';

interface UserPointsRow extends RowDataPacket {
  name: string;
  email: string;
  esg_points_balance: number | string;
}

interface BadgeRow extends RowDataPacket {
  id: number;
  name: string;
  unlock_rule: { points_required?: number } | string;
}

function parseUnlockRule(raw: BadgeRow['unlock_rule']): { points_required?: number } {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

/**
 * Award every active badge whose points_required the user currently meets.
 * Safe to call repeatedly (INSERT IGNORE / already-owned check).
 * Returns number of newly awarded badges.
 */
export async function awardEligibleBadges(userId: number): Promise<number> {
  try {
    const [userRows] = await pool.execute<UserPointsRow[]>(
      'SELECT name, email, esg_points_balance FROM users WHERE id = ? AND status = ? LIMIT 1',
      [userId, 'active'],
    );
    const user = userRows[0];
    if (!user) return 0;

    // MySQL DECIMAL can arrive as string — always coerce
    const balance = Number(user.esg_points_balance);
    if (!Number.isFinite(balance)) {
      logger.warn('awardEligibleBadges: invalid points balance', { userId, raw: user.esg_points_balance });
      return 0;
    }

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
      if (!Number.isFinite(pointsRequired) || pointsRequired < 0) continue;

      if (balance < pointsRequired) continue;

      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT IGNORE INTO user_badges (user_id, badge_id, awarded_reason)
         VALUES (?, ?, ?)`,
        [
          userId,
          badge.id,
          `Unlocked by achieving an ESG points balance of ${balance} (Requirement: ${pointsRequired}).`,
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

      await pool.execute(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES (?, 'badge_unlocked', ?, ?)`,
        [
          userId,
          'Badge Unlocked!',
          `Congratulations! You have unlocked the ${badge.name}.`,
        ],
      );

      // Optional email (best-effort)
      try {
        const [settingsRows] = await pool.execute<RowDataPacket[]>(
          'SELECT value FROM system_settings WHERE `key` = ? LIMIT 1',
          ['notification_config'],
        );
        const config = settingsRows[0]?.value as
          | { emailAlertsChallenges?: boolean; autoAwardBadges?: boolean }
          | undefined;

        // Respect auto-award / email toggles when present (default: send)
        if (config?.emailAlertsChallenges === false) continue;

        const htmlContent = `
          <div style="font-family: monospace; background-color: #0d0d0d; color: #00ff41; padding: 24px; border: 1px solid #444444;">
            <h2 style="color: #00ff41;">[ECOSPHERE ACHIEVEMENT SYSTEM]</h2>
            <p style="color: #8b8b8b;">// Badge Achievement Unlocked</p>
            <div style="border: 1px solid #00ff41; padding: 16px; margin: 16px 0; background: rgba(0,255,65,0.03);">
              ACHIEVEMENT: ${badge.name}<br>
              RECIPIENT: ${user.name}<br>
              POINTS HELD: ${balance}
            </div>
            <p style="color: #f1f5f9;">You reached the required points threshold and unlocked this achievement!</p>
          </div>
        `;

        sendMail({
          to: user.email,
          subject: `Achievement Unlocked: ${badge.name}!`,
          html: htmlContent,
        }).catch((mailErr: Error) => {
          logger.error('Failed to send badge unlock email', { error: mailErr.message });
        });
      } catch {
        // non-fatal
      }
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
    total += await awardEligibleBadges(Number(user.id));
  }
  logger.info('Completed system-wide badge re-evaluation', { awardedCount: total });
  return total;
}
