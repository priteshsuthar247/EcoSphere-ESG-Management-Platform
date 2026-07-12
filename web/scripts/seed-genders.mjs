import mysql from 'mysql2/promise';

const p = await mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ecosphere',
});

const genders = [
  ['aditi.rao@ecosphere.com', 'female'],
  ['neha.patel@ecosphere.com', 'female'],
  ['ananya.iyer@ecosphere.com', 'female'],
  ['divya.nair@ecosphere.com', 'female'],
  ['meera.joshi@ecosphere.com', 'female'],
  ['ishita.bose@ecosphere.com', 'female'],
  ['sneha.kulkarni@ecosphere.com', 'female'],
  ['pooja.sharma@ecosphere.com', 'female'],
  ['sara.khan@ecosphere.com', 'female'],
  ['karan.shah@ecosphere.com', 'male'],
  ['vikram.das@ecosphere.com', 'male'],
  ['rohit.verma@ecosphere.com', 'male'],
  ['arjun.reddy@ecosphere.com', 'male'],
  ['kabir.singh@ecosphere.com', 'male'],
  ['farhan.ali@ecosphere.com', 'male'],
  ['yash.malhotra@ecosphere.com', 'male'],
  ['dev.kapoor@ecosphere.com', 'male'],
  ['head.mfg@ecosphere.com', 'male'],
  ['head.log@ecosphere.com', 'male'],
  ['head.corp@ecosphere.com', 'male'],
  ['head.sales@ecosphere.com', 'female'],
  ['head.hr@ecosphere.com', 'female'],
  ['head.it@ecosphere.com', 'male'],
  ['ceo@ecosphere.com', 'female'],
  ['admin@ecosphere.com', 'male'],
  ['mohit.jain@ecosphere.com', 'non-binary'],
];

for (const [email, g] of genders) {
  await p.execute('UPDATE users SET gender = ? WHERE email = ?', [g, email]);
}

const [rows] = await p.query(
  `SELECT COALESCE(NULLIF(TRIM(gender), ''), 'unspecified') AS g, COUNT(*) AS n
   FROM users WHERE status = 'active' GROUP BY g ORDER BY n DESC`,
);
console.log(rows);
await p.end();
