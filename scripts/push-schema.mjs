import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected to:', (await client.query('SELECT current_database()')).rows[0].current_database);

    // Create all tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        display_name TEXT,
        google_id TEXT UNIQUE,
        avatar TEXT,
        facebook_handle TEXT,
        instagram_handle TEXT,
        tiktok_handle TEXT,
        youtube_handle TEXT,
        platform TEXT DEFAULT 'local',
        country TEXT DEFAULT 'Unknown',
        points INTEGER NOT NULL DEFAULT 0,
        cashable_points INTEGER NOT NULL DEFAULT 0,
        pending_points INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        progress INTEGER NOT NULL DEFAULT 0,
        global_rank INTEGER,
        role TEXT DEFAULT 'member',
        region TEXT DEFAULT 'Unknown',
        referral_code TEXT NOT NULL UNIQUE,
        referred_by INTEGER,
        daily_tasks_completed INTEGER NOT NULL DEFAULT 0,
        last_task_date DATE,
        streak_count INTEGER NOT NULL DEFAULT 0,
        last_login_date DATE,
        notification_preferences JSONB DEFAULT '{}',
        is_public BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        last_login TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        task_url TEXT NOT NULL,
        platform TEXT NOT NULL,
        type TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 50,
        is_active BOOLEAN NOT NULL DEFAULT true,
        max_completions INTEGER,
        expires_at TIMESTAMP,
        scheduled_publish_at TIMESTAMP,
        category TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        task_id INTEGER NOT NULL,
        completed_at TIMESTAMP NOT NULL,
        points_earned INTEGER NOT NULL,
        verification_status TEXT NOT NULL DEFAULT 'pending',
        verified_at TIMESTAMP,
        verified_by INTEGER
      );

      CREATE TABLE IF NOT EXISTS daily_task_allocation (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        task_id INTEGER NOT NULL,
        allocated_date DATE NOT NULL,
        is_completed BOOLEAN NOT NULL DEFAULT false,
        UNIQUE(user_id, task_id, allocated_date)
      );

      CREATE TABLE IF NOT EXISTS milestones (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        target INTEGER NOT NULL,
        category TEXT NOT NULL,
        icon TEXT NOT NULL,
        icon_bg_color TEXT NOT NULL,
        progress_color TEXT NOT NULL,
        reward INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_milestones (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        milestone_id INTEGER NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        reward_claimed BOOLEAN NOT NULL DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER NOT NULL,
        referred_id INTEGER NOT NULL,
        points_awarded INTEGER NOT NULL DEFAULT 0,
        is_processed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS referral_reward_claims (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        referral_count INTEGER NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMP,
        processed_by INTEGER,
        payment_method TEXT,
        payment_details TEXT
      );

      CREATE TABLE IF NOT EXISTS referral_tiers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        min_referrals INTEGER NOT NULL,
        bonus_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_method TEXT NOT NULL,
        payment_details TEXT,
        requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMP,
        processed_by INTEGER
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_by INTEGER
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS task_clicks (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        clicked_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ip_address TEXT,
        user_agent TEXT,
        session_id TEXT,
        converted_to_completion BOOLEAN NOT NULL DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        admin_only BOOLEAN NOT NULL DEFAULT false,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS classroom_videos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT NOT NULL,
        transcript TEXT,
        points_reward INTEGER NOT NULL DEFAULT 50,
        thumbnail_url TEXT,
        is_published BOOLEAN NOT NULL DEFAULT false,
        display_order INTEGER NOT NULL DEFAULT 0,
        scheduled_publish_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS classroom_completions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        video_id INTEGER NOT NULL,
        completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        points_earned INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT 'blue',
        criteria TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        badge_id INTEGER NOT NULL,
        awarded_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS point_listings (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER NOT NULL,
        buyer_id INTEGER,
        points_amount INTEGER NOT NULL,
        price_per_point NUMERIC(10,4) NOT NULL,
        total_price NUMERIC(10,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        listed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        sold_at TIMESTAMP,
        expires_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS listing_comments (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS promotion_plans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        platform TEXT NOT NULL DEFAULT 'facebook',
        engagement_count INTEGER NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_by INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS promotion_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        plan_id INTEGER NOT NULL,
        social_media_url TEXT NOT NULL,
        platform TEXT NOT NULL,
        engagement_type TEXT NOT NULL,
        additional_details TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        price NUMERIC(10,2) NOT NULL,
        custom_engagement_count INTEGER,
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        stripe_session_id TEXT,
        points_used INTEGER,
        requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        assigned_to INTEGER,
        completed_at TIMESTAMP,
        admin_notes TEXT
      );

      CREATE TABLE IF NOT EXISTS level_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        achieved_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS profile_links (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS qr_email_leads (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        original_url TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shortened_urls (
        id SERIAL PRIMARY KEY,
        original_url TEXT NOT NULL,
        short_code TEXT NOT NULL UNIQUE,
        clicks INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ad_placements (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        placement TEXT NOT NULL,
        ad_code TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS session (
        sid TEXT NOT NULL PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);

    console.log('✅ All tables created successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
