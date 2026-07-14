import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// Singleton pool — reused across all requests in the same process.
// This prevents ECONNREFUSED errors caused by creating too many short-lived connections.
const globalForDb = global as unknown as { pool: mysql.Pool };

const pool =
  globalForDb.pool ??
  mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,      // max simultaneous connections
    queueLimit: 0,            // unlimited queued requests
    connectTimeout: 10000,    // 10s connect timeout
    idleTimeout: 60000,       // release idle connections after 60s
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

if (process.env.NODE_ENV !== "production") {
  // In development, preserve the pool across hot-reloads
  globalForDb.pool = pool;
}

const db = drizzle(pool);

export { db };
