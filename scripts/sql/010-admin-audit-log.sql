-- ---------------------------------------------------------------------------
-- 010, Admin activity log
--
-- Creates ONE new table. Nothing existing is altered and no data is touched.
-- CREATE TABLE IF NOT EXISTS is safe to run more than once.
--
-- Records who did what in the admin panel: payouts, point changes, account
-- deletions, role changes, settings, proof reviews and password resets.
-- Until you run this the panel works as before; actions just aren't logged.
-- ---------------------------------------------------------------------------


-- STEP 1, create the table.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT NOT NULL,
  action      VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NULL,
  target_id   INT NULL,
  summary     VARCHAR(500) NOT NULL,
  details     TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_audit_created (created_at),
  INDEX idx_admin_audit_admin (admin_id),
  INDEX idx_admin_audit_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- STEP 2, verify. Should return the column list above.

SHOW COLUMNS FROM admin_audit_log;
