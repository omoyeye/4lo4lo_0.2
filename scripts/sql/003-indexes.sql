-- ---------------------------------------------------------------------------
-- 003 — Indexes for the hot lookup paths
--
-- Adding an index is non-destructive: it creates a secondary structure and
-- never modifies or deletes row data. It does take a metadata lock while
-- building, so run it during a quiet period on a large table.
--
-- Run 001 first if you have not — the unique constraint it adds also serves as
-- the (user_id, task_id) index, which makes the first statement here redundant.
-- ---------------------------------------------------------------------------


-- STEP 1 — See what already exists, so you don't add duplicates.

SELECT table_name, index_name, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS cols
FROM   information_schema.statistics
WHERE  table_schema = DATABASE()
  AND  table_name IN ('user_tasks', 'task_clicks', 'referrals',
                      'daily_task_allocation', 'notifications', 'payouts')
GROUP  BY table_name, index_name
ORDER  BY table_name, index_name;


-- STEP 2 — Add what is missing. Skip any statement whose columns already
-- appear as the LEFTMOST columns of an existing index in STEP 1's output.

-- Task completion counts are now aggregated with GROUP BY task_id
-- (storage.getTaskCompletionCounts). Without this the query is a full scan.
-- SKIP THIS if you applied 001 — its UNIQUE (user_id, task_id) already covers
-- lookups by user_id, but NOT grouping by task_id, so this one is still useful.
ALTER TABLE user_tasks ADD INDEX idx_user_tasks_task_id (task_id);

-- getCompletedTasks / getCompletedTaskIds filter by user_id.
-- SKIP if 001's UNIQUE (user_id, task_id) is applied — it covers this.
-- ALTER TABLE user_tasks ADD INDEX idx_user_tasks_user_id (user_id);

-- Click analytics group by task, and the completion path looks up a click by
-- id + user_id to verify ownership.
ALTER TABLE task_clicks ADD INDEX idx_task_clicks_task_id (task_id);
ALTER TABLE task_clicks ADD INDEX idx_task_clicks_user_id (user_id);

-- Daily allocation is filtered by (user_id, task_id, allocated_date) on every
-- task completion.
ALTER TABLE daily_task_allocation
  ADD INDEX idx_dta_user_task_date (user_id, task_id, allocated_date);

-- Referral counts and history.
ALTER TABLE referrals ADD INDEX idx_referrals_referrer (referrer_id);

-- The notification bell polls unread counts per user.
ALTER TABLE notifications ADD INDEX idx_notifications_user (user_id);

-- The admin payout queue sorts by requested_at; user payout history filters
-- by user_id.
ALTER TABLE payouts ADD INDEX idx_payouts_user_id (user_id);


-- STEP 3 — Verify, and sanity-check a plan.

-- SHOW INDEX FROM user_tasks;
-- EXPLAIN SELECT task_id, COUNT(*) FROM user_tasks GROUP BY task_id;
--   Look for "Using index" in the Extra column. A full table scan here means
--   the index was not applied or is not being chosen.


-- ---------------------------------------------------------------------------
-- ROLLBACK — dropping an index removes no data:
--
--   ALTER TABLE user_tasks           DROP INDEX idx_user_tasks_task_id;
--   ALTER TABLE task_clicks          DROP INDEX idx_task_clicks_task_id;
--   ALTER TABLE task_clicks          DROP INDEX idx_task_clicks_user_id;
--   ALTER TABLE daily_task_allocation DROP INDEX idx_dta_user_task_date;
--   ALTER TABLE referrals            DROP INDEX idx_referrals_referrer;
--   ALTER TABLE notifications        DROP INDEX idx_notifications_user;
--   ALTER TABLE payouts              DROP INDEX idx_payouts_user_id;
-- ---------------------------------------------------------------------------
