import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

/**
 * MySQL connection pool.
 *
 * ── Why the settings look the way they do on Vercel ──────────────────────────
 *
 * This app is deployed to Vercel serverless functions. A "singleton pool per
 * process" means one pool *per concurrent lambda instance*, not one pool for
 * the application. The previous configuration used connectionLimit: 10, so
 * 20 concurrent instances could open up to 200 MySQL connections. Shared MySQL
 * hosts typically cap max_connections between 100 and 151, so a modest traffic
 * spike would exhaust the server and every request would start failing with
 * ER_CON_COUNT_ERROR, including requests from instances that were previously
 * healthy.
 *
 * The fix is to keep each instance's footprint small and let horizontal
 * concurrency, rather than per-instance pooling, absorb load.
 *
 * enableKeepAlive was also actively harmful here: Vercel freezes an instance
 * between invocations, so keepalive probes never fire, MySQL closes the socket
 * server-side after wait_timeout, and the pool hands out a dead connection on
 * the next request, surfacing as intermittent PROTOCOL_CONNECTION_LOST or
 * ECONNRESET. Short idle timeouts mean connections are dropped before the
 * server kills them.
 *
 * If you outgrow this, the real answer is a connection proxy that multiplexes
 * (PlanetScale, ProxySQL, or MySQL Router) rather than a bigger pool.
 */

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Per-instance connection ceiling.
 *
 * Budget it as: max_connections / expected_concurrent_instances, with headroom
 * for your own admin sessions and migrations. Override with DB_CONNECTION_LIMIT
 * if you know your numbers.
 */
const connectionLimit = process.env.DB_CONNECTION_LIMIT
  ? parseInt(process.env.DB_CONNECTION_LIMIT, 10)
  : isServerless
    ? 2
    : 10;

const globalForDb = global as unknown as { pool?: mysql.Pool };

function createPool(): mysql.Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env, or add it in the Vercel project's Environment Variables."
    );
  }

  return mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit,
    // Queue rather than reject when the small pool is saturated; a brief wait
    // beats an error, and connectTimeout still bounds the worst case.
    queueLimit: 0,
    connectTimeout: 10_000,
    // Return connections to the server quickly so a frozen instance is not
    // holding sockets it cannot use.
    idleTimeout: isServerless ? 10_000 : 60_000,
    maxIdle: isServerless ? 1 : connectionLimit,
    // Deliberately off on serverless, see the note above.
    enableKeepAlive: !isServerless,
    keepAliveInitialDelay: 0,
  });
}

/**
 * Cache the pool on globalThis in EVERY environment.
 *
 * Previously this only happened when NODE_ENV !== "production", which meant a
 * warm serverless instance could not reuse a pool across module re-evaluations.
 */
const pool = globalForDb.pool ?? createPool();
globalForDb.pool = pool;

const db = drizzle(pool);

export { db, pool, connectionLimit };
