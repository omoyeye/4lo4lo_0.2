-- ---------------------------------------------------------------------------
-- 007, Separate "visible to members" from "published on the open web"
--
-- WHY: users.is_public meant both things at once, so sitemap.xml published the
-- entire member list to search engines. The live sitemap carried 12 profiles,
-- including a user's email address as a URL and the admin username.
--
-- The obvious fix, making everyone private, would also have shut down the
-- follow button and the activity feed, because both gate on that same column,
-- AND would have killed every creator's link-in-bio, which is the product.
--
-- The fix is to control what gets ADVERTISED rather than what is reachable:
--
--   is_public     the user shows a profile at all. Anyone holding the link can
--                 open it, account or not, which is what makes a bio link
--                 work. Members can also follow them and see them in the feed.
--                 Existing column, meaning preserved, still defaults to true.
--                 NOT CHANGED BY THIS SCRIPT.
--
--   is_indexable  the profile is additionally ADVERTISED: listed in
--                 sitemap.xml and allowed into search results. New column,
--                 defaults to 0.
--
-- Nobody can be enumerated through the sitemap or search, while shared links
-- keep working. A profile that is not indexed is unlisted, not unreachable.
--
-- WHAT THIS DOES TO YOUR DATA: adds one column with a default of 0. It updates
-- no existing rows. Nothing any user has today is altered, and the community
-- features keep working exactly as they do now.
--
-- Compare with what a blanket "make everyone private" would have cost: every
-- follow relationship becomes unusable and the feed empties. This achieves the
-- same privacy result, which is that nobody is on the public web unless they
-- ask, without that damage.
--
-- SAFE TO RUN WHILE THE SITE IS LIVE. ADD COLUMN with a default is fast on a
-- table this size, and the application already runs correctly both before and
-- after: every read of is_indexable is wrapped and fails closed, so until this
-- runs the app behaves as though nobody has opted in. There is no window where
-- the site is broken and no need to deploy in a particular order.
-- ---------------------------------------------------------------------------


-- STEP 1, add the column.
--
-- Default 0: being advertised to search engines is a decision a user makes,
-- not a state they wake up in. Existing rows all get 0, so sitemap.xml lists
-- no profiles and none are indexable until someone opts in. Every profile URL
-- keeps working when shared, which is the point of the feature.

ALTER TABLE users
  ADD COLUMN is_indexable BOOLEAN NOT NULL DEFAULT 0;


-- STEP 2, verify. Expect indexable = 0 and total unchanged.

SELECT
  COUNT(*)                                          AS total_users,
  SUM(CASE WHEN is_public    = 1 THEN 1 ELSE 0 END) AS have_a_profile_page,
  SUM(CASE WHEN is_indexable = 1 THEN 1 ELSE 0 END) AS listed_in_search
FROM users;


-- STEP 3 (optional), index it if the table grows.
--
-- Skip this for now. At a dozen users the sitemap query reads the whole table
-- either way, and an index on a low-cardinality boolean earns nothing. Worth
-- revisiting past a few thousand rows.
--
--   CREATE INDEX idx_users_indexable ON users (is_indexable, is_public);


-- ---------------------------------------------------------------------------
-- AFTER RUNNING
--
-- Users opt in individually: Settings, Profile tab, "Show my profile in search
-- engines". The switch is disabled until this script has been run, and it
-- requires "Visible to other members" to be on first.
--
-- To put a specific account on the public web yourself, for example your own:
--
--   UPDATE users SET is_indexable = 1 WHERE id = <id> LIMIT 1;
--
-- Do NOT run `UPDATE users SET is_indexable = 1` with no WHERE. That publishes
-- every member to search engines and recreates the exact problem this fixes.
-- ---------------------------------------------------------------------------


-- ROLLBACK
--
-- Fully reversible. The column is new, so dropping it loses only the opt-in
-- choices, and the application treats a missing column as "nobody opted in".
--
--   ALTER TABLE users DROP COLUMN is_indexable;


-- ---------------------------------------------------------------------------
-- OPTIONAL, LATER: rename the account whose username is an email address
--
-- Not urgent. lib/profile-visibility.ts already refuses to render or list any
-- email-shaped username, so that address is off the public web regardless of
-- this script. This is the tidy-up, for when you are ready to contact them.
--
-- Renaming changes how they SIGN IN, so agree the new handle with them first.
-- Their email stays in the email column, where it belongs, and is unaffected.
--
-- 1. Find the account and check the new handle is free:
--
--      SELECT id, username, email FROM users WHERE username LIKE '%@%';
--      SELECT id FROM users WHERE username = 'newhandle';   -- expect 0 rows
--
-- 2. Rename, keyed on id rather than username:
--
--      UPDATE users SET username = 'newhandle' WHERE id = <id> LIMIT 1;
--
-- 3. Verify exactly one row changed:
--
--      SELECT id, username, email FROM users WHERE id = <id>;
--
-- Then request removal of the old URL in Google Search Console. It 404s now,
-- so it drops out eventually, but the Removals tool takes it out of results in
-- about a day rather than weeks.
-- ---------------------------------------------------------------------------
