// src/config/db.ts
// MySQL connection pool configuration
// All credentials are loaded from environment variables — never hardcoded.

import mysql from 'mysql2/promise';
import logger from '@/lib/logger';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecosphere',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+00:00',
});

// Test connection on startup (non-blocking)
pool.getConnection()
  .then(async (conn) => {
    logger.info('✅ MySQL connection pool established successfully');
    
    // Automatically run self-migration for password_resets table
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id          BIGINT AUTO_INCREMENT PRIMARY KEY,
          user_id     BIGINT NOT NULL,
          token       VARCHAR(255) NOT NULL UNIQUE,
          expires_at  DATETIME NOT NULL,
          created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_pr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);
      logger.info('✅ Database auto-migration completed: password_resets table ready.');
    } catch (migErr) {
      logger.error('❌ Database auto-migration failed', { error: (migErr as Error).message });
    }
    
    conn.release();
  })
  .catch((err) => {
    logger.error('❌ MySQL connection pool failed to initialise', { error: err.message });
  });

export default pool;
