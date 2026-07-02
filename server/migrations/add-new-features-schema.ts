import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("Running schema migration for new features (idempotent)...");

  try {
    // ── 1. Extend users table ──────────────────────────────────────────────
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS streak_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_login_date DATE,
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
    `);
    console.log("✅ Extended users table (streak, login date, is_public)");

    // Safe migration for notification_preferences TEXT → JSONB
    const notifColInfo = await pool.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'notification_preferences';
    `);
    if (notifColInfo.rows.length === 0) {
      await pool.query(`
        ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{}';
      `);
      console.log("✅ Added notification_preferences as JSONB");
    } else if (notifColInfo.rows[0].data_type === 'text') {
      // Safe in-place cast — coerces existing '{}' strings to JSONB, preserving data
      await pool.query(`
        ALTER TABLE users
          ALTER COLUMN notification_preferences TYPE JSONB
          USING COALESCE(notification_preferences::jsonb, '{}');
        ALTER TABLE users
          ALTER COLUMN notification_preferences SET DEFAULT '{}';
      `);
      console.log("✅ Cast notification_preferences TEXT → JSONB (data preserved)");
    } else {
      console.log("ℹ️  notification_preferences already JSONB, skipping");
    }

    // ── 2. Extend tasks table ──────────────────────────────────────────────
    await pool.query(`
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS category TEXT;
    `);
    console.log("✅ Extended tasks table");

    // ── 3. Extend classroom_videos table ──────────────────────────────────
    await pool.query(`
      ALTER TABLE classroom_videos
        ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP;
    `);
    console.log("✅ Extended classroom_videos table");

    // ── 4. badges table ───────────────────────────────────────────────────
    // Create with correct JSONB condition column; handle old wrong schema safely
    const badgesExists = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'badges';
    `);
    if (badgesExists.rows.length === 0) {
      await pool.query(`
        CREATE TABLE badges (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          icon_name TEXT NOT NULL DEFAULT 'award',
          condition JSONB NOT NULL,
          points_bonus INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log("✅ Created badges table");
    } else {
      // Table exists — ensure correct shape: add condition JSONB if missing,
      // drop old split columns if they linger (safe because badges carry no user data).
      const conditionColExists = await pool.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'badges' AND column_name = 'condition';
      `);
      if (conditionColExists.rows.length === 0) {
        await pool.query(`
          ALTER TABLE badges
            ADD COLUMN IF NOT EXISTS condition JSONB NOT NULL DEFAULT '{"type":"","threshold":0}';
          ALTER TABLE badges DROP COLUMN IF EXISTS condition_type;
          ALTER TABLE badges DROP COLUMN IF EXISTS condition_threshold;
        `);
        console.log("✅ Migrated badges to JSONB condition column");
      } else {
        console.log("ℹ️  badges.condition already correct, skipping");
      }
    }

    // ── 5. user_badges table ──────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        badge_key TEXT NOT NULL,
        earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, badge_key)
      );
    `);
    console.log("✅ Created user_badges table (with unique constraint)");

    // ── 6. referral_tiers table ───────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_tiers (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        min_referrals INTEGER NOT NULL,
        max_referrals INTEGER,
        multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Created referral_tiers table");

    const tiersCount = await pool.query(`SELECT COUNT(*) FROM referral_tiers`);
    if (parseInt(tiersCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO referral_tiers (label, min_referrals, max_referrals, multiplier) VALUES
          ('Standard', 1, 20, 1.00),
          ('Silver',   21, 50, 1.50),
          ('Gold',     51, NULL, 2.00);
      `);
      console.log("✅ Seeded default referral tiers");
    } else {
      console.log("ℹ️  Referral tiers already seeded, skipping");
    }

    // ── 7. Marketplace tables ─────────────────────────────────────────────

    // Create listing_status enum if not exists
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE listing_status AS ENUM ('open', 'sold');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("✅ Ensured listing_status enum");

    // Create point_listings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS point_listings (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER NOT NULL,
        buyer_id INTEGER,
        points_amount INTEGER NOT NULL,
        note TEXT,
        status listing_status NOT NULL DEFAULT 'open',
        sold_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Created point_listings table");

    // Add sold_at column if it was missing from an older version of the table
    await pool.query(`
      ALTER TABLE point_listings ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP;
    `);

    // Migrate status column from text to enum if needed
    const statusColType = await pool.query(`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'point_listings' AND column_name = 'status';
    `);
    if (statusColType.rows.length > 0 && statusColType.rows[0].data_type === 'text') {
      await pool.query(`
        ALTER TABLE point_listings ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE point_listings ALTER COLUMN status TYPE listing_status USING status::listing_status;
        ALTER TABLE point_listings ALTER COLUMN status SET DEFAULT 'open'::listing_status;
      `);
      console.log("✅ Migrated point_listings.status TEXT → listing_status enum");
    } else {
      console.log("ℹ️  point_listings.status already enum, skipping");
    }

    // Create listing_comments table with unique constraint
    await pool.query(`
      CREATE TABLE IF NOT EXISTS listing_comments (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_user_comment UNIQUE (listing_id, user_id)
      );
    `);
    console.log("✅ Created listing_comments table (with unique user-per-listing constraint)");

    // Add unique constraint if table already existed without it
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE listing_comments ADD CONSTRAINT unique_user_comment UNIQUE (listing_id, user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ── 8. level_history table ────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS level_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        reached_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Created level_history table");

    console.log("\n✅ All migrations complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  } finally {
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
