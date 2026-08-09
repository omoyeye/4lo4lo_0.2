-- ---------------------------------------------------------------------------
-- 004 — Who is affected by disabling Google sign-in (READ-ONLY)
--
-- Every statement here is a SELECT. Nothing below modifies data.
--
-- WHY THIS EXISTS: accounts created through Google sign-in were given a random
-- password generated at signup (auth.ts used randomBytes(32)), which the owner
-- has never seen and cannot be told. With the Google provider removed, those
-- users cannot sign in with credentials. Their only route back in is the
-- forgot-password flow, which requires a real email address.
--
-- auth.ts fell back to `<googleId>@google.user` when Google returned no email.
-- Those accounts have NO recovery path at all.
-- ---------------------------------------------------------------------------


-- STEP 1 — How many accounts are affected, and how badly.

SELECT
  COUNT(*)                                                        AS google_accounts,
  SUM(email LIKE '%@google.user')                                 AS no_recovery_path,
  SUM(email NOT LIKE '%@google.user' AND email LIKE '%@%')        AS can_reset_by_email
FROM   users
WHERE  google_id IS NOT NULL
   OR  platform = 'google'
   OR  username LIKE 'google\_%';


-- STEP 2 — The accounts with no recovery path, in full.
--
-- These users are locked out until Google sign-in is restored, or until you
-- set a real email on their row so password reset can reach them.
-- Check `points` before deciding — a locked-out user with a balance is a
-- support problem, not just a login problem.

SELECT id, username, email, display_name, points, created_at,
       last_login_date
FROM   users
WHERE  email LIKE '%@google.user'
ORDER  BY points DESC, created_at DESC;


-- STEP 3 — Accounts that CAN recover, so you can tell them how.
--
-- Export this list and send a "reset your password" message before, not after,
-- they discover the Google button is gone.

SELECT id, username, email, display_name, points, created_at
FROM   users
WHERE  (google_id IS NOT NULL OR platform = 'google')
  AND  email NOT LIKE '%@google.user'
  AND  email LIKE '%@%'
ORDER  BY created_at DESC;


-- STEP 4 — Sanity check: are any of them admins?
-- Locking out your own admin account is an easy mistake to make here.

SELECT id, username, email, role
FROM   users
WHERE  (google_id IS NOT NULL OR platform = 'google')
  AND  role IN ('admin', 'superadmin');


-- ---------------------------------------------------------------------------
-- IF YOU NEED TO GIVE ONE USER A RECOVERY ROUTE
--
-- Set a real email on their row so the forgot-password flow can reach them.
-- Verify the address out-of-band first — changing it to an address you do not
-- control hands over the account. One row at a time, never a bulk UPDATE.
--
--   UPDATE users SET email = 'verified@address.example'
--   WHERE  id = <exact_id> AND email LIKE '%@google.user' LIMIT 1;
--
-- Do NOT set a password hash directly. Let them go through password reset so
-- the hash is produced by the current code path.
-- ---------------------------------------------------------------------------
