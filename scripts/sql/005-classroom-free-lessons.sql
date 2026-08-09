-- ---------------------------------------------------------------------------
-- 005, Choose which Classroom lessons are free to watch
--
-- Optional. Without this row the first 3 published lessons by display order
-- are free, which is a sensible default and needs no action.
--
-- No schema change: classroom_videos is untouched. This is one row in
-- app_settings, which is why it does not require a migration.
--
-- Behaviour on /learn and /learn/lessons/<id>:
--   Every published lesson gets a public page with its title, description and
--   transcript, which is what search engines index. The video player is only
--   rendered for lessons listed here, and the video URL is not sent to the
--   browser for the others, so the gate is real rather than cosmetic.
-- ---------------------------------------------------------------------------


-- STEP 1, see what is published and what order it is in. Read-only.

SELECT id, display_order, is_published,
       LEFT(title, 60) AS title,
       CHAR_LENGTH(transcript) AS transcript_chars
FROM   classroom_videos
WHERE  is_published = 1
ORDER  BY display_order, created_at;

-- Lessons with an empty transcript have nothing for search engines to index.
-- Fill those in before promoting a lesson as a public entry point.


-- STEP 2, set the free list. Replace the ids with your own.
-- Pick the lessons that stand alone and make someone want the rest.

-- INSERT INTO app_settings (`key`, value, description)
-- VALUES ('classroom_free_lesson_ids', '1,2,3', 'Lesson ids watchable without an account')
-- ON DUPLICATE KEY UPDATE value = VALUES(value);


-- STEP 3, verify.

SELECT `key`, value FROM app_settings WHERE `key` = 'classroom_free_lesson_ids';


-- ---------------------------------------------------------------------------
-- To go back to the default (first 3 by display order), delete the row:
--
--   DELETE FROM app_settings WHERE `key` = 'classroom_free_lesson_ids';
--
-- Deleting it removes configuration only. No lesson data is affected.
-- ---------------------------------------------------------------------------
