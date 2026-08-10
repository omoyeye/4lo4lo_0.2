-- ---------------------------------------------------------------------------
-- 006, Community: user follows
--
-- Creates ONE new table. Nothing existing is altered and no data is touched.
-- CREATE TABLE IF NOT EXISTS is safe to run more than once.
--
-- Until you run this, the follow button and the activity feed degrade
-- quietly: follow returns a clear "not enabled" response, the feed falls back
-- to showing recent activity from the whole platform instead of from the
-- people you follow, and nothing 500s. So there is no rush and no downtime.
--
-- WHY ONLY ONE TABLE: the activity feed is a read model over rows that
-- already exist. Task completions come from user_tasks, badges from
-- user_badges, level ups from level_history. The only thing genuinely
-- missing was the graph of who follows whom.
-- ---------------------------------------------------------------------------


-- STEP 1, create the table.

CREATE TABLE IF NOT EXISTS user_follows (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  follower_id   INT NOT NULL,
  following_id  INT NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- One row per pair. This is what makes following idempotent: a double tap
  -- on the follow button is rejected by the database rather than relying on
  -- a read-then-write check in application code, which is a race.
  CONSTRAINT uq_user_follows UNIQUE (follower_id, following_id),

  -- "Who does this user follow", for the feed query.
  INDEX idx_user_follows_follower (follower_id),
  -- "Who follows this user", for the follower count on a profile.
  INDEX idx_user_follows_following (following_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 2, verify.

SHOW CREATE TABLE user_follows;

SELECT COUNT(*) AS follow_rows FROM user_follows;


-- ---------------------------------------------------------------------------
-- OPTIONAL, foreign keys.
--
-- Deliberately not included above. Adding them requires that every existing
-- users.id referenced is present and that the column types match exactly, and
-- a failed ALTER on a live database during business hours is a worse outcome
-- than not having the constraint. The application always writes valid ids.
--
-- If you want them, run these separately and be ready to roll back:
--
--   ALTER TABLE user_follows
--     ADD CONSTRAINT fk_follows_follower
--     FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE;
--
--   ALTER TABLE user_follows
--     ADD CONSTRAINT fk_follows_following
--     FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE;
--
-- Without the cascade, deleting a user leaves orphaned follow rows. The
-- application filters those out on read, so they are untidy rather than
-- harmful.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- ROLLBACK
--
--   DROP TABLE user_follows;
--
-- This destroys the follow graph and nothing else. No user, task, point or
-- payout data lives in this table.
-- ---------------------------------------------------------------------------
