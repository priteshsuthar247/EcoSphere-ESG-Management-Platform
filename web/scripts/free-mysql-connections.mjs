import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
});

const [rows] = await conn.query(
  `SELECT id, user, host, db, command, time
   FROM information_schema.processlist
   WHERE command = 'Sleep' AND time > 2
   ORDER BY time DESC`,
);
console.log('Sleeping connections:', rows.length);

for (const r of rows) {
  try {
    await conn.query(`KILL ${Number(r.id)}`);
  } catch {
    // ignore
  }
}

const [status] = await conn.query(`SHOW STATUS LIKE 'Threads_connected'`);
console.log(status);
await conn.end();
console.log('Done');
