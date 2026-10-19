-- ---------------------------------------------------------------------------
-- 008, Mobile app push notification tokens
--
-- Creates ONE new table. Nothing existing is altered and no data is touched.
-- CREATE TABLE IF NOT EXISTS is safe to run more than once.
--
-- Until you run this, push notifications are simply off: the app's token
-- registration gets a "not enabled" response, in-app notifications keep
-- working exactly as before, and nothing 500s.
--
-- One row per device. A user signed in on two phones has two rows. When Expo
-- reports a token as no longer registered (app uninstalled), the server
-- deletes that row on its own.
-- ---------------------------------------------------------------------------


-- STEP 1, create the table.

CREATE TABLE IF NOT EXISTS mobile_push_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token       VARCHAR(255) NOT NULL,
  platform    VARCHAR(16) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- A device token belongs to whoever signed in on that device last.
  CONSTRAINT uq_mobile_push_tokens_token UNIQUE (token),
  INDEX idx_mobile_push_tokens_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 2, verify. Should return the column list above.

SHOW COLUMNS FROM mobile_push_tokens;
