-- ---------------------------------------------------------------------------
-- 001 — Prevent double task completions
--
-- READ THIS BEFORE RUNNING. Run the steps in order, on a live database, and
-- take a backup first. Nothing here is run automatically by the application.
--
-- WHY: user_tasks has no unique constraint on (user_id, task_id). The
-- application checked "already completed?" with a SELECT and then INSERTed,
-- which is a read-then-write race: two concurrent requests can both pass the
-- check and both award points. The application-side guard in
-- lib/core/storage.db.ts narrows the window but cannot close it. Only the
-- database can.
-- ---------------------------------------------------------------------------


-- STEP 1 — Look for existing duplicates. Run this first, on its own.
-- If it returns zero rows, skip to STEP 3.

SELECT user_id,
       task_id,
       COUNT(*)        AS copies,
       MIN(id)         AS keep_id,
       SUM(points_earned) AS points_awarded_total
FROM   user_tasks
GROUP  BY user_id, task_id
HAVING COUNT(*) > 1
ORDER  BY copies DESC;


-- STEP 2 — Only if STEP 1 returned rows.
--
-- Decide deliberately what to do about the extra points that were awarded.
-- Deleting the duplicate rows does NOT claw back the points already added to
-- users.points; that is a business decision, not a technical one. Removing the
-- rows without adjusting balances leaves users holding points they should not
-- have — which may well be the right call for goodwill.
--
-- Preview exactly what would be deleted:

-- SELECT ut.*
-- FROM   user_tasks ut
-- JOIN  (SELECT user_id, task_id, MIN(id) AS keep_id
--        FROM   user_tasks
--        GROUP  BY user_id, task_id
--        HAVING COUNT(*) > 1) d
--   ON  ut.user_id = d.user_id
--  AND  ut.task_id = d.task_id
--  AND  ut.id      <> d.keep_id;

-- Then, and only then, delete the extras (keeping the earliest completion):

-- DELETE ut
-- FROM   user_tasks ut
-- JOIN  (SELECT user_id, task_id, MIN(id) AS keep_id
--        FROM   user_tasks
--        GROUP  BY user_id, task_id
--        HAVING COUNT(*) > 1) d
--   ON  ut.user_id = d.user_id
--  AND  ut.task_id = d.task_id
--  AND  ut.id      <> d.keep_id;


-- STEP 3 — Add the constraint.
--
-- This will FAIL if duplicates remain, which is the intended safety behaviour:
-- it refuses rather than silently discarding rows. On a large table this takes
-- a metadata lock; run it during a quiet period.

ALTER TABLE user_tasks
  ADD CONSTRAINT uq_user_tasks_user_task UNIQUE (user_id, task_id);


-- STEP 4 — Verify.

SHOW INDEX FROM user_tasks WHERE Key_name = 'uq_user_tasks_user_task';


-- ---------------------------------------------------------------------------
-- ROLLBACK, if the constraint causes an unforeseen problem:
--
--   ALTER TABLE user_tasks DROP INDEX uq_user_tasks_user_task;
--
-- Dropping it is non-destructive — it removes the index, not any data.
-- ---------------------------------------------------------------------------
