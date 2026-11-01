-- ---------------------------------------------------------------------------
-- 011, Community posts, comments and likes
--
-- Creates THREE new tables. Nothing existing is altered and no data is touched.
-- CREATE TABLE IF NOT EXISTS is safe to run more than once.
--
-- Until you run this the Community page shows activity only and the post
-- composer says posting isn't enabled yet. Limits (250 words per post, 100
-- per comment) are enforced by the application.
-- ---------------------------------------------------------------------------


-- STEP 1, posts. like_count / comment_count are kept in step by the app so
-- the feed doesn't count rows on every load.

CREATE TABLE IF NOT EXISTS community_posts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  body          TEXT NOT NULL,
  like_count    INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_community_posts_created (created_at),
  INDEX idx_community_posts_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 2, comments.

CREATE TABLE IF NOT EXISTS community_post_comments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  post_id     INT NOT NULL,
  user_id     INT NOT NULL,
  body        VARCHAR(1000) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_community_comments_post (post_id, created_at),
  INDEX idx_community_comments_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 3, likes. One row per member per post.

CREATE TABLE IF NOT EXISTS community_post_likes (
  post_id     INT NOT NULL,
  user_id     INT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  INDEX idx_community_likes_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 4, verify. Should list all three tables.

SHOW TABLES LIKE 'community_post%';
