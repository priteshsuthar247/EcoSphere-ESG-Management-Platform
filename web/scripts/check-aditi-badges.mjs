import mysql from 'mysql2/promise';

const p = await mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ecosphere',
});

const [users] = await p.query(
  `SELECT id, name, email, esg_points_balance, total_xp, status
   FROM users WHERE email LIKE '%aditi%' OR name LIKE '%Aditi%'`,
);
console.log('USER:', users);

const [badges] = await p.query(
  `SELECT id, name, unlock_rule, status FROM badges ORDER BY id`,
);
console.log('BADGES:', badges);

if (users[0]) {
  const [ub] = await p.query(`SELECT * FROM user_badges WHERE user_id = ?`, [users[0].id]);
  console.log('ADITI AWARDS:', ub);

  // Simulate eligibility
  const pts = Number(users[0].esg_points_balance);
  console.log('Aditi points (number):', pts, typeof users[0].esg_points_balance);
  for (const b of badges) {
    const rule = typeof b.unlock_rule === 'string' ? JSON.parse(b.unlock_rule) : b.unlock_rule;
    const need = Number(rule?.points_required);
    console.log(
      `  ${b.name}: need ${need}, has ${pts}, eligible=${pts >= need}`,
    );
  }
}

const [all] = await p.query(
  `SELECT u.name, u.esg_points_balance, b.name AS badge
   FROM user_badges ub
   JOIN users u ON u.id = ub.user_id
   JOIN badges b ON b.id = ub.badge_id
   ORDER BY u.name`,
);
console.log('ALL AWARDS:', all);

await p.end();
