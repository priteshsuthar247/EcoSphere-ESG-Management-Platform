/**
 * One-shot: award badges to all users who already meet point thresholds.
 * Run: node scripts/award-eligible-badges.mjs
 */
import mysql from 'mysql2/promise';

const p = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecosphere',
});

const [users] = await p.query(
  `SELECT id, name, email, esg_points_balance FROM users WHERE status = 'active'`,
);
const [badges] = await p.query(
  `SELECT id, name, unlock_rule FROM badges WHERE status = 'active' ORDER BY id`,
);

let total = 0;

for (const user of users) {
  const balance = Number(user.esg_points_balance);
  const [owned] = await p.query(`SELECT badge_id FROM user_badges WHERE user_id = ?`, [user.id]);
  const set = new Set(owned.map((r) => Number(r.badge_id)));

  for (const b of badges) {
    if (set.has(Number(b.id))) continue;
    const rule =
      typeof b.unlock_rule === 'string' ? JSON.parse(b.unlock_rule) : b.unlock_rule || {};
    const need = Number(rule.points_required);
    if (!Number.isFinite(need) || balance < need) continue;

    await p.execute(
      `INSERT IGNORE INTO user_badges (user_id, badge_id, awarded_reason) VALUES (?, ?, ?)`,
      [
        user.id,
        b.id,
        `Unlocked by ESG points balance of ${balance} (Requirement: ${need}).`,
      ],
    );
    await p.execute(
      `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'badge_unlocked', ?, ?)`,
      [user.id, 'Badge Unlocked!', `Congratulations! You have unlocked the ${b.name}.`],
    );
    total++;
    console.log(`AWARDED  ${user.name.padEnd(20)} → ${b.name}  (pts=${balance}, need=${need})`);
  }
}

console.log(`\nTotal newly awarded: ${total}`);

const [aditi] = await p.query(
  `SELECT u.name, u.esg_points_balance, b.name AS badge
   FROM user_badges ub
   JOIN users u ON u.id = ub.user_id
   JOIN badges b ON b.id = ub.badge_id
   WHERE u.email = 'aditi.rao@ecosphere.com'`,
);
console.log('Aditi badges now:', aditi);

await p.end();
