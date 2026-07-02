/**
 * migrate-to-mysql.ts
 *
 * Migrates ALL data from Neon PostgreSQL → local MySQL.
 *
 * ✅  Read-only on Neon — NEVER writes/deletes remote data.
 * ✅  Idempotent — safe to re-run (uses INSERT IGNORE + AUTO_INCREMENT reset).
 * ✅  Handles jsonb → JSON, numeric → decimal, enums → varchar.
 * ✅  Resets AUTO_INCREMENT to MAX(id)+1 after each table.
 * ✅  Prints per-table row-count diff for verification.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-mysql.ts
 */

import pg from "pg";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// ─── Connection helpers ────────────────────────────────────────────────────

function getPgPool(): pg.Pool {
  const { Pool } = pg;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in .env");
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

async function getMysqlConn(): Promise<mysql.Connection> {
  return mysql.createConnection({
    host: process.env.MYSQL_DB_HOST || "localhost",
    user: process.env.MYSQL_DB_USER || "root",
    password: process.env.MYSQL_DB_PASSWORD || "",
    database: process.env.MYSQL_DB_NAME || "growsocial",
    multipleStatements: true,
    timezone: "Z",
  });
}

// ─── Colour helpers ────────────────────────────────────────────────────────
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

// ─── SQL for every table ───────────────────────────────────────────────────

const CREATE_STATEMENTS: Record<string, string> = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT NOT NULL,
      display_name VARCHAR(255),
      google_id VARCHAR(255) UNIQUE,
      avatar TEXT,
      facebook_handle VARCHAR(255),
      instagram_handle VARCHAR(255),
      tiktok_handle VARCHAR(255),
      youtube_handle VARCHAR(255),
      platform VARCHAR(100) DEFAULT 'local',
      country VARCHAR(100) DEFAULT 'Unknown',
      points INT NOT NULL DEFAULT 0,
      cashable_points INT NOT NULL DEFAULT 0,
      pending_points INT NOT NULL DEFAULT 0,
      level INT NOT NULL DEFAULT 1,
      progress INT NOT NULL DEFAULT 0,
      global_rank INT,
      role VARCHAR(50) DEFAULT 'member',
      region VARCHAR(100) DEFAULT 'Unknown',
      referral_code VARCHAR(100) NOT NULL UNIQUE,
      referred_by INT,
      daily_tasks_completed INT NOT NULL DEFAULT 0,
      last_task_date DATE,
      streak_count INT NOT NULL DEFAULT 0,
      last_login_date DATE,
      notification_preferences JSON,
      is_public TINYINT(1) NOT NULL DEFAULT 1,
      bio TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  admins: `
    CREATE TABLE IF NOT EXISTS admins (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      last_login TIMESTAMP NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  app_settings: `
    CREATE TABLE IF NOT EXISTS app_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(255) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  tasks: `
    CREATE TABLE IF NOT EXISTS tasks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      task_url TEXT NOT NULL,
      platform VARCHAR(100) NOT NULL,
      type VARCHAR(100) NOT NULL,
      points INT NOT NULL DEFAULT 50,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      max_completions INT,
      expires_at TIMESTAMP NULL,
      scheduled_publish_at TIMESTAMP NULL,
      category VARCHAR(100),
      difficulty VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  milestones: `
    CREATE TABLE IF NOT EXISTS milestones (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      target INT NOT NULL,
      category VARCHAR(100) NOT NULL,
      icon VARCHAR(100) NOT NULL,
      icon_bg_color VARCHAR(100) NOT NULL,
      progress_color VARCHAR(100) NOT NULL,
      reward INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  promotion_plans: `
    CREATE TABLE IF NOT EXISTS promotion_plans (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      platform VARCHAR(100) NOT NULL DEFAULT 'facebook',
      engagement_count INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      display_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  task_batches: `
    CREATE TABLE IF NOT EXISTS task_batches (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      target_user_count INT NOT NULL,
      actual_allocated_count INT NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      allocation_criteria TEXT,
      strategy VARCHAR(50) NOT NULL DEFAULT 'random',
      priority INT NOT NULL DEFAULT 5,
      scheduled_at TIMESTAMP NULL,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INT NOT NULL,
      paused_by INT,
      paused_reason TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  user_segments: `
    CREATE TABLE IF NOT EXISTS user_segments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      criteria TEXT NOT NULL,
      user_count INT NOT NULL DEFAULT 0,
      average_engagement DECIMAL(5,2) DEFAULT '0',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  badges: `
    CREATE TABLE IF NOT EXISTS badges (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(255) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon_name VARCHAR(100) NOT NULL DEFAULT 'award',
      \`condition\` JSON NOT NULL,
      points_bonus INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  referral_tiers: `
    CREATE TABLE IF NOT EXISTS referral_tiers (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      label VARCHAR(100) NOT NULL,
      min_referrals INT NOT NULL,
      max_referrals INT,
      multiplier DECIMAL(4,2) NOT NULL DEFAULT '1.00',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  classroom_videos: `
    CREATE TABLE IF NOT EXISTS classroom_videos (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL,
      thumbnail_url TEXT,
      transcript TEXT NOT NULL DEFAULT '',
      points_reward INT NOT NULL DEFAULT 50,
      is_published TINYINT(1) NOT NULL DEFAULT 0,
      display_order INT NOT NULL DEFAULT 0,
      scheduled_publish_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  point_listings: `
    CREATE TABLE IF NOT EXISTS point_listings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      seller_id INT NOT NULL,
      buyer_id INT,
      points_amount INT NOT NULL,
      note TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      sold_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  shortened_urls: `
    CREATE TABLE IF NOT EXISTS shortened_urls (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      short_code VARCHAR(100) NOT NULL UNIQUE,
      original_url TEXT NOT NULL,
      clicks INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  qr_email_leads: `
    CREATE TABLE IF NOT EXISTS qr_email_leads (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      original_url TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  ad_placements: `
    CREATE TABLE IF NOT EXISTS ad_placements (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      position VARCHAR(50) NOT NULL DEFAULT 'top',
      ad_code TEXT NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  user_tasks: `
    CREATE TABLE IF NOT EXISTS user_tasks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      task_id INT NOT NULL,
      completed_at TIMESTAMP NOT NULL,
      points_earned INT NOT NULL,
      verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      verified_at TIMESTAMP NULL,
      verified_by INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  user_milestones: `
    CREATE TABLE IF NOT EXISTS user_milestones (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      milestone_id INT NOT NULL,
      progress INT NOT NULL DEFAULT 0,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      completed_at TIMESTAMP NULL,
      reward_claimed TINYINT(1) NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  daily_task_allocation: `
    CREATE TABLE IF NOT EXISTS daily_task_allocation (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      task_id INT NOT NULL,
      allocated_date DATE NOT NULL,
      is_completed TINYINT(1) NOT NULL DEFAULT 0,
      UNIQUE KEY uq_allocation (user_id, task_id, allocated_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  referrals: `
    CREATE TABLE IF NOT EXISTS referrals (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      referrer_id INT NOT NULL,
      referred_id INT NOT NULL,
      points_awarded INT NOT NULL DEFAULT 0,
      is_processed TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  referral_reward_claims: `
    CREATE TABLE IF NOT EXISTS referral_reward_claims (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      referral_count INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP NULL,
      processed_by INT,
      payment_method VARCHAR(100),
      payment_details TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  payouts: `
    CREATE TABLE IF NOT EXISTS payouts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      payment_method VARCHAR(100) NOT NULL,
      payment_details TEXT,
      requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP NULL,
      processed_by INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  password_reset_tokens: `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(512) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  task_clicks: `
    CREATE TABLE IF NOT EXISTS task_clicks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      user_id INT NOT NULL,
      clicked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(100),
      user_agent TEXT,
      session_id VARCHAR(255),
      converted_to_completion TINYINT(1) NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  promotion_requests: `
    CREATE TABLE IF NOT EXISTS promotion_requests (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      plan_id INT NOT NULL,
      social_media_url TEXT NOT NULL,
      platform VARCHAR(100) NOT NULL,
      engagement_type VARCHAR(100) NOT NULL,
      additional_details TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      price DECIMAL(10,2) NOT NULL,
      custom_engagement_count INT,
      payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
      stripe_session_id VARCHAR(255),
      points_used INT,
      requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      assigned_to INT,
      completed_at TIMESTAMP NULL,
      admin_notes TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  batch_task_allocations: `
    CREATE TABLE IF NOT EXISTS batch_task_allocations (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      task_id INT NOT NULL,
      user_id INT NOT NULL,
      allocated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) NOT NULL DEFAULT 'allocated',
      clicked_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      points_earned INT DEFAULT 0,
      expires_at TIMESTAMP NULL,
      user_segment VARCHAR(100),
      allocation_reason TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  user_analytics: `
    CREATE TABLE IF NOT EXISTS user_analytics (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      date DATE NOT NULL,
      login_count INT NOT NULL DEFAULT 0,
      tasks_viewed INT NOT NULL DEFAULT 0,
      tasks_clicked INT NOT NULL DEFAULT 0,
      tasks_completed INT NOT NULL DEFAULT 0,
      time_spent_minutes INT NOT NULL DEFAULT 0,
      engagement_score DECIMAL(5,2) DEFAULT '0',
      activity_level VARCHAR(50) DEFAULT 'low',
      last_activity_at TIMESTAMP NULL,
      device_info TEXT,
      geo_location TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  allocation_analytics: `
    CREATE TABLE IF NOT EXISTS allocation_analytics (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      metric_name VARCHAR(255) NOT NULL,
      metric_value DECIMAL(10,4) NOT NULL,
      metric_unit VARCHAR(50),
      calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_id INT,
      task_id INT,
      user_segment VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  task_performance: `
    CREATE TABLE IF NOT EXISTS task_performance (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      date DATE NOT NULL,
      total_allocations INT NOT NULL DEFAULT 0,
      total_clicks INT NOT NULL DEFAULT 0,
      total_completions INT NOT NULL DEFAULT 0,
      average_time_to_click INT DEFAULT 0,
      average_time_to_complete INT DEFAULT 0,
      click_through_rate DECIMAL(5,2) DEFAULT '0',
      completion_rate DECIMAL(5,2) DEFAULT '0',
      user_satisfaction_score DECIMAL(3,2) DEFAULT '0',
      revenue_generated DECIMAL(10,2) DEFAULT '0'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  system_metrics: `
    CREATE TABLE IF NOT EXISTS system_metrics (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      metric_name VARCHAR(255) NOT NULL,
      metric_value DECIMAL(15,4) NOT NULL,
      metric_unit VARCHAR(50),
      timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      server_node VARCHAR(255),
      alert_threshold DECIMAL(15,4),
      is_alert TINYINT(1) NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  user_preferences: `
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      preferred_platforms TEXT,
      preferred_task_types TEXT,
      optimal_task_count INT DEFAULT 5,
      best_active_hours TEXT,
      notification_preferences TEXT,
      difficulty_preference VARCHAR(50) DEFAULT 'medium',
      points_motivation INT DEFAULT 5,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  notifications: `
    CREATE TABLE IF NOT EXISTS notifications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      admin_only TINYINT(1) NOT NULL DEFAULT 0,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  listing_comments: `
    CREATE TABLE IF NOT EXISTS listing_comments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      listing_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_comment (listing_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  classroom_completions: `
    CREATE TABLE IF NOT EXISTS classroom_completions (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      video_id INT NOT NULL,
      points_earned INT NOT NULL,
      completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  user_badges: `
    CREATE TABLE IF NOT EXISTS user_badges (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      badge_key VARCHAR(255) NOT NULL,
      earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_badge (user_id, badge_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  level_history: `
    CREATE TABLE IF NOT EXISTS level_history (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      level INT NOT NULL,
      reached_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

  profile_links: `
    CREATE TABLE IF NOT EXISTS profile_links (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(100) NOT NULL,
      url TEXT NOT NULL,
      display_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
};

// Migration order (FK-safe: parent tables first)
const TABLE_ORDER = [
  "users",
  "admins",
  "app_settings",
  "tasks",
  "milestones",
  "promotion_plans",
  "task_batches",
  "user_segments",
  "badges",
  "referral_tiers",
  "classroom_videos",
  "point_listings",
  "shortened_urls",
  "qr_email_leads",
  "ad_placements",
  "user_tasks",
  "user_milestones",
  "daily_task_allocation",
  "referrals",
  "referral_reward_claims",
  "payouts",
  "password_reset_tokens",
  "task_clicks",
  "promotion_requests",
  "batch_task_allocations",
  "user_analytics",
  "allocation_analytics",
  "task_performance",
  "system_metrics",
  "user_preferences",
  "notifications",
  "listing_comments",
  "classroom_completions",
  "user_badges",
  "level_history",
  "profile_links",
];

// ─── Value serialiser ──────────────────────────────────────────────────────

/**
 * Converts a PostgreSQL row value to a MySQL-safe value.
 *   - null stays null
 *   - objects/arrays (jsonb) → JSON string
 *   - Date objects → ISO string (mysql2 handles the rest)
 *   - everything else passes through
 */
function toMysqlValue(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && !(v instanceof Date)) {
    return JSON.stringify(v);
  }
  return v;
}

// ─── Per-table migration ───────────────────────────────────────────────────

async function migrateTable(
  pgPool: pg.Pool,
  mysqlConn: mysql.Connection,
  tableName: string
): Promise<{ pg: number; mysql: number }> {
  // 1. Get PG rows
  const { rows } = await pgPool.query(`SELECT * FROM "${tableName}" ORDER BY id`);
  const pgCount = rows.length;

  if (pgCount === 0) {
    console.log(`  ${c.yellow("⊘")} ${tableName}: 0 rows — skipping insert`);
    return { pg: 0, mysql: 0 };
  }

  // 2. Build column list from first row
  const cols = Object.keys(rows[0]);
  const escapedCols = cols.map((col) => `\`${col}\``).join(", ");
  const placeholders = cols.map(() => "?").join(", ");

  let inserted = 0;
  const BATCH = 500;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    for (const row of batch) {
      const values = cols.map((col) => toMysqlValue(row[col]));
      try {
        await mysqlConn.execute(
          `INSERT IGNORE INTO \`${tableName}\` (${escapedCols}) VALUES (${placeholders})`,
          values
        );
        inserted++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          c.red(`  ✗ Failed row id=${row.id} in ${tableName}: ${msg}`)
        );
      }
    }
    process.stdout.write(
      `\r  Inserting ${tableName}: ${Math.min(i + BATCH, rows.length)} / ${rows.length}`
    );
  }
  process.stdout.write("\n");

  // 3. Reset AUTO_INCREMENT to MAX(id)+1 to avoid collisions on future inserts
  const [maxRow] = await mysqlConn.execute<mysql.RowDataPacket[]>(
    `SELECT COALESCE(MAX(id), 0) AS max_id FROM \`${tableName}\``
  );
  const maxId = (maxRow[0] as { max_id: number }).max_id;
  await mysqlConn.execute(
    `ALTER TABLE \`${tableName}\` AUTO_INCREMENT = ${maxId + 1}`
  );

  return { pg: pgCount, mysql: inserted };
}

// ─── Ensure database exists ────────────────────────────────────────────────

async function ensureDatabase(): Promise<void> {
  const dbName = process.env.MYSQL_DB_NAME || "growsocial";
  const rootConn = await mysql.createConnection({
    host: process.env.MYSQL_DB_HOST || "localhost",
    user: process.env.MYSQL_DB_USER || "root",
    password: process.env.MYSQL_DB_PASSWORD || "",
    multipleStatements: false,
  });
  await rootConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(c.green(`✔ Database \`${dbName}\` ready`));
  await rootConn.end();
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(c.bold("\n🚀 GrowSocial — Neon PostgreSQL → MySQL Migration\n"));

  // Ensure target DB exists
  await ensureDatabase();

  const pgPool = getPgPool();
  const mysqlConn = await getMysqlConn();

  // Disable FK checks while creating/inserting
  await mysqlConn.execute("SET FOREIGN_KEY_CHECKS = 0");
  await mysqlConn.execute("SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'");

  console.log(c.cyan("\n📋 Creating tables...\n"));
  for (const table of TABLE_ORDER) {
    const sql = CREATE_STATEMENTS[table];
    if (!sql) {
      console.warn(c.yellow(`  ⚠ No CREATE statement for ${table} — skipping`));
      continue;
    }
    await mysqlConn.execute(sql);
    process.stdout.write(`  ${c.green("✔")} ${table}\n`);
  }

  console.log(c.cyan("\n📦 Migrating data...\n"));

  const summary: Array<{ table: string; pg: number; mysql: number }> = [];

  for (const table of TABLE_ORDER) {
    if (!CREATE_STATEMENTS[table]) continue;
    process.stdout.write(`\n  ${c.bold(table)}\n`);
    try {
      const counts = await migrateTable(pgPool, mysqlConn, table);
      summary.push({ table, ...counts });
      const match = counts.pg === counts.mysql;
      console.log(
        `  ${match ? c.green("✔") : c.red("✗")} pg=${counts.pg}  mysql=${counts.mysql}  ${match ? c.green("OK") : c.red("MISMATCH")}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(c.red(`  ✗ Error migrating ${table}: ${msg}`));
      summary.push({ table, pg: -1, mysql: -1 });
    }
  }

  // Re-enable FK checks
  await mysqlConn.execute("SET FOREIGN_KEY_CHECKS = 1");

  // ─── Summary table ───────────────────────────────────────────────────────
  console.log(c.bold("\n\n📊 Migration Summary\n"));
  console.log(
    ["Table", "PG rows", "MySQL rows", "Status"]
      .map((h) => h.padEnd(30))
      .join("")
  );
  console.log("─".repeat(120));

  let allOk = true;
  for (const row of summary) {
    const ok = row.pg === row.mysql && row.pg >= 0;
    if (!ok) allOk = false;
    const status = ok ? c.green("✔ OK") : c.red("✗ MISMATCH");
    console.log(
      [
        row.table.padEnd(30),
        String(row.pg).padEnd(30),
        String(row.mysql).padEnd(30),
        status,
      ].join("")
    );
  }

  console.log("─".repeat(120));

  if (allOk) {
    console.log(c.green(c.bold("\n✅ Migration complete — all rows transferred successfully!\n")));
  } else {
    console.log(
      c.red(c.bold("\n⚠️  Migration finished with mismatches — review the rows above.\n"))
    );
    process.exitCode = 1;
  }

  await mysqlConn.end();
  await pgPool.end();
}

main().catch((err) => {
  console.error(c.red("\n💥 Fatal error:"), err);
  process.exit(1);
});
