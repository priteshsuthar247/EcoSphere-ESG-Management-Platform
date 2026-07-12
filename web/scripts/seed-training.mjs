/**
 * Seed demo employee training completions
 */
import mysql from "mysql2/promise";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ecosphere",
});

const trainings = [
  ["ESG Fundamentals 101", "ESG", 2.0],
  ["Carbon Accounting Basics", "Environmental", 3.5],
  ["Workplace Diversity & Inclusion", "Social", 1.5],
  ["Governance & Ethics", "Governance", 2.5],
  ["Safety & Compliance Refresh", "Compliance", 1.0],
  ["Sustainable Procurement", "Environmental", 2.0],
];

try {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS employee_trainings (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      training_name VARCHAR(200) NOT NULL,
      category VARCHAR(50),
      completion_date DATE NOT NULL,
      hours DECIMAL(5, 2),
      certificate_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_et_user (user_id)
    ) ENGINE=InnoDB
  `);

  const [users] = await pool.execute(
    `SELECT id, name FROM users
     WHERE status='active' AND role IN ('employee','departmental_head')
     ORDER BY id LIMIT 12`,
  );

  let inserted = 0;
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const t = trainings[i % trainings.length];
    const daysAgo = 10 + i * 7;
    const [r1] = await pool.execute(
      `INSERT INTO employee_trainings (user_id, training_name, category, completion_date, hours, certificate_url)
       SELECT ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM employee_trainings WHERE user_id = ? AND training_name = ?
       )`,
      [u.id, t[0], t[1], daysAgo, t[2], "https://example.com/certs/demo.pdf", u.id, t[0]],
    );
    if (r1.affectedRows) inserted++;

    if (i % 2 === 0) {
      const t2 = trainings[(i + 2) % trainings.length];
      const [r2] = await pool.execute(
        `INSERT INTO employee_trainings (user_id, training_name, category, completion_date, hours, certificate_url)
         SELECT ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), ?, NULL
         WHERE NOT EXISTS (
           SELECT 1 FROM employee_trainings WHERE user_id = ? AND training_name = ?
         )`,
        [u.id, t2[0], t2[1], daysAgo + 3, t2[2], u.id, t2[0]],
      );
      if (r2.affectedRows) inserted++;
    }
  }

  const [cnt] = await pool.execute("SELECT COUNT(*) AS c FROM employee_trainings");
  console.log(`Inserted ~${inserted} new rows. Total trainings: ${cnt[0].c}`);
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await pool.end();
}
