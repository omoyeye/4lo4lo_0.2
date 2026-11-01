-- ---------------------------------------------------------------------------
-- 009, Task proofs, uploads, email verification, device checks, payout holds
--
-- Creates FIVE new tables. Nothing existing is altered and no data is touched.
-- CREATE TABLE IF NOT EXISTS is safe to run more than once.
--
-- Until you run this the site keeps working exactly as before:
--   * proof uploads, photo uploads (without Vercel Blob), email verification
--     and device checks report "not enabled yet" instead of failing;
--   * payout requests still check the balance, but points are not reserved
--     until payout_holds exists.
-- ---------------------------------------------------------------------------


-- STEP 1, uploaded images (profile photos and task proof screenshots).
-- Only used when BLOB_READ_WRITE_TOKEN is not set on Vercel. Images are
-- resized in the browser/app first, so rows are typically 20-300 KB.

CREATE TABLE IF NOT EXISTS media_uploads (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  kind        VARCHAR(32) NOT NULL,          -- avatar | proof
  visibility  VARCHAR(16) NOT NULL DEFAULT 'public',  -- public | private
  mime        VARCHAR(64) NOT NULL,
  data        MEDIUMBLOB NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_media_uploads_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 2, proof of task completion. Points sit in users.pending_points until
-- an admin approves the screenshot.

CREATE TABLE IF NOT EXISTS task_proofs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  task_id       INT NOT NULL,
  user_task_id  INT NULL,
  image_url     VARCHAR(512) NOT NULL,
  note          VARCHAR(500) NULL,
  points        INT NOT NULL DEFAULT 0,
  status        VARCHAR(16) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  reject_reason VARCHAR(500) NULL,
  reviewed_by   INT NULL,
  reviewed_at   TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task_proofs_status (status, created_at),
  INDEX idx_task_proofs_user (user_id),
  INDEX idx_task_proofs_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 3, email verification. One row per user; the token is stored hashed.

CREATE TABLE IF NOT EXISTS email_verifications (
  user_id     INT NOT NULL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  token_hash  CHAR(64) NULL,
  sent_at     TIMESTAMP NULL,
  verified_at TIMESTAMP NULL,
  INDEX idx_email_verifications_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 4, devices seen per account, for spotting one person running many
-- accounts. device_id is a random ID the browser/app generates; ip_hash is a
-- salted SHA-256 of the IP address, never the address itself.

CREATE TABLE IF NOT EXISTS user_devices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  device_id   VARCHAR(64) NOT NULL,
  ip_hash     CHAR(64) NULL,
  platform    VARCHAR(16) NULL,
  user_agent  VARCHAR(255) NULL,
  seen_count  INT NOT NULL DEFAULT 1,
  first_seen  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_devices UNIQUE (user_id, device_id),
  INDEX idx_user_devices_device (device_id),
  INDEX idx_user_devices_ip (ip_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 5, points reserved by a payout request, so a rejected request can be
-- refunded exactly and a member cannot request the same points twice.

CREATE TABLE IF NOT EXISTS payout_holds (
  payout_id   INT NOT NULL PRIMARY KEY,
  user_id     INT NOT NULL,
  amount      INT NOT NULL,
  released    TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payout_holds_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 6, verify. Should list all five tables.

SHOW TABLES LIKE 'media_uploads';
SHOW TABLES LIKE 'task_proofs';
SHOW TABLES LIKE 'email_verifications';
SHOW TABLES LIKE 'user_devices';
SHOW TABLES LIKE 'payout_holds';
