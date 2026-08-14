-- ---------------------------------------------------------------------------
-- 007, Profiles private by default
--
-- WHY: users.is_public defaulted to TRUE, so every account that ever signed
-- up was published at /profile/<username> and listed in sitemap.xml. The live
-- sitemap carried 12 profiles, including:
--
--   /profile/aramramadan7%40gmail.com   a user's EMAIL ADDRESS as a public,
--                                       search-submitted URL
--   /profile/admin                      the admin username, which is half of
--                                       the credentials for /admin/login
--   /profile/Gracious%20Mandate%20      a trailing space, so the link is
--                                       invisible-broken and unshareable
--
-- This script flips the default and retires the existing public flags, so
-- visibility becomes something a user opts into from Settings rather than
-- something that happened to them.
--
-- THIS IS A DATA CHANGE ON A LIVE DATABASE. It writes one boolean column on
-- every user row. It touches nothing else: no points, no tasks, no payments,
-- no passwords. It is fully reversible, and STEP 0 saves what to reverse to.
--
-- Run STEP 0 first and keep its output. Without it the previous opt-in state
-- cannot be recovered, because the flip overwrites it.
--
-- The code guard shipped separately and does NOT depend on this script.
-- lib/profile-visibility.ts already withholds email-shaped, reserved and
-- malformed usernames from the sitemap, the profile page and the profile API,
-- regardless of what is_public says. So the email address above stops being
-- published at the next deploy whether or not you run this.
-- ---------------------------------------------------------------------------


-- STEP 0, RECORD THE CURRENT STATE. Do not skip this.
--
-- Save the output somewhere durable. These are the users who were public
-- before the flip, and this list is the only way to restore them if you
-- change your mind.

SELECT id, username, is_public
FROM users
WHERE is_public = 1
ORDER BY id;

-- How many rows the next step will change:
SELECT COUNT(*) AS will_be_made_private FROM users WHERE is_public = 1;


-- STEP 1, change the column default so NEW signups are private.
--
-- Safe: ALTER ... ALTER COLUMN SET DEFAULT is metadata only. It does not
-- rewrite the table and does not touch existing rows.

ALTER TABLE users ALTER COLUMN is_public SET DEFAULT 0;


-- STEP 2, make existing profiles private.
--
-- This is the one destructive-ish statement in the file, in the sense that it
-- discards the previous per-user value. STEP 0 is your backup.

UPDATE users SET is_public = 0 WHERE is_public = 1;


-- STEP 3, verify. Expect public_profiles = 0.

SELECT
  COUNT(*)                                    AS total_users,
  SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) AS public_profiles
FROM users;


-- ---------------------------------------------------------------------------
-- ROLLBACK
--
-- To restore the previous default:
--
--   ALTER TABLE users ALTER COLUMN is_public SET DEFAULT 1;
--
-- To restore the users who were public, using the id list from STEP 0:
--
--   UPDATE users SET is_public = 1 WHERE id IN (/* ids from STEP 0 */);
--
-- Do NOT roll back with `UPDATE users SET is_public = 1` with no WHERE. That
-- would publish every account, including ones that were private by choice
-- before this script ran.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- OPTIONAL, LATER: rename the account whose username is an email address
--
-- Not required. The code guard already withholds the page and the sitemap
-- entry. This is the tidy-up, for when you are ready to contact that user.
--
-- Renaming changes how they SIGN IN, so agree the new handle with them first.
-- Their email stays in the email column, where it belongs, and is unaffected.
--
-- 1. Confirm the account and check the new handle is free:
--
--      SELECT id, username, email, is_public FROM users
--      WHERE username LIKE '%@%';
--
--      SELECT id FROM users WHERE username = 'newhandle';   -- expect 0 rows
--
-- 2. Rename it, keyed on id rather than username. Fill in both values:
--
--      UPDATE users SET username = 'newhandle' WHERE id = <id> LIMIT 1;
--
-- 3. Verify exactly one row changed:
--
--      SELECT id, username, email FROM users WHERE id = <id>;
--
-- Also worth doing once renamed: request removal of the indexed URL in Google
-- Search Console. The page now 404s, which drops it eventually, but the
-- Removals tool takes it out of results in about a day rather than weeks.
-- ---------------------------------------------------------------------------
