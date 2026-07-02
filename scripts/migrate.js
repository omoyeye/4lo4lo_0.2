#!/usr/bin/env node
// Direct SQL migration — creates any missing tables without interactive prompts.
// Safe to run multiple times (all statements use IF NOT EXISTS).

import pg from 'pg';
const { Client } = pg;

const SQL = `
CREATE TABLE IF NOT EXISTS task_batches (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_user_count INTEGER NOT NULL,
  actual_allocated_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  allocation_criteria TEXT,
  strategy TEXT NOT NULL DEFAULT 'random',
  priority INTEGER NOT NULL DEFAULT 5,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER NOT NULL,
  paused_by INTEGER,
  paused_reason TEXT
);

CREATE TABLE IF NOT EXISTS batch_task_allocations (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  allocated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'allocated',
  clicked_at TIMESTAMP,
  completed_at TIMESTAMP,
  points_earned INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  user_segment TEXT,
  allocation_reason TEXT
);

CREATE TABLE IF NOT EXISTS user_analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL,
  login_count INTEGER NOT NULL DEFAULT 0,
  tasks_viewed INTEGER NOT NULL DEFAULT 0,
  tasks_clicked INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  time_spent_minutes INTEGER NOT NULL DEFAULT 0,
  engagement_score NUMERIC(5,2) DEFAULT 0,
  activity_level TEXT DEFAULT 'low',
  last_activity_at TIMESTAMP,
  device_info TEXT,
  geo_location TEXT
);

CREATE TABLE IF NOT EXISTS allocation_analytics (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(10,4) NOT NULL,
  metric_unit TEXT,
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id INTEGER,
  task_id INTEGER,
  user_segment TEXT
);

CREATE TABLE IF NOT EXISTS user_segments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  criteria TEXT NOT NULL,
  user_count INTEGER NOT NULL DEFAULT 0,
  average_engagement NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS task_performance (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  date DATE NOT NULL,
  total_allocations INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  average_time_to_click INTEGER DEFAULT 0,
  average_time_to_complete INTEGER DEFAULT 0,
  click_through_rate NUMERIC(5,2) DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,
  user_satisfaction_score NUMERIC(3,2) DEFAULT 0,
  revenue_generated NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS system_metrics (
  id SERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC(15,4) NOT NULL,
  metric_unit TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  server_node TEXT,
  alert_threshold NUMERIC(15,4),
  is_alert BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS classroom_videos (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  transcript TEXT,
  points_reward INTEGER NOT NULL DEFAULT 50,
  thumbnail_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
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

CREATE TABLE IF NOT EXISTS qr_email_leads (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  original_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE qr_email_leads ADD COLUMN IF NOT EXISTS original_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS shortened_urls (
  id SERIAL PRIMARY KEY,
  short_code TEXT NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE shortened_urls ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS ad_placements (
  id SERIAL PRIMARY KEY,
  position TEXT NOT NULL DEFAULT 'top',
  ad_code TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE ad_placements ADD COLUMN IF NOT EXISTS ad_code TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS profile_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_links_user_id ON profile_links(user_id);
`;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
console.log('Running SQL migrations...');
await client.query(SQL);
console.log('All tables created/verified successfully.');
await client.end();
