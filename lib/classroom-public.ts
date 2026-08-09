/*
 * Nothing here is imported at module scope on purpose.
 *
 * lib/db.ts throws when DATABASE_URL is missing, and lib/core/storage.ts pulls
 * it in transitively. A module-scope import therefore throws during module
 * evaluation, before any try/catch in a function body can run, which took the
 * whole /learn hub down with a 500 even though the guides on it are static
 * content that never touches the database.
 *
 * Loading inside the functions keeps a database problem contained: the guides
 * still render, the lessons section is simply empty.
 */

/**
 * Public view of the Classroom.
 *
 * The whole Classroom used to sit behind auth, so none of it could be indexed
 * and none of it could act as a way in. This exposes published lessons as
 * public pages: title, description and transcript are readable by anyone,
 * which is the part search engines can use, while the video itself is only
 * playable on lessons marked free or by a signed-in user.
 *
 * WHICH LESSONS ARE FREE IS CONFIGURED, NOT SCHEMA.
 *
 * classroom_videos has no "is_free" column and this app runs against a live
 * production database, so adding one is a migration the operator has to run
 * deliberately rather than something the code does on its own. Instead the
 * free set is stored in app_settings under `classroom_free_lesson_ids` as a
 * comma-separated list of ids, which is an ordinary row insert.
 *
 * With the key unset, the first FREE_FALLBACK_COUNT lessons by display order
 * are free. That gives a sensible default on day one with no configuration.
 *
 * To pin an explicit set, from the admin panel or SQL:
 *   INSERT INTO app_settings (`key`, value) VALUES ('classroom_free_lesson_ids', '3,7,12')
 *   ON DUPLICATE KEY UPDATE value = '3,7,12';
 */

export const FREE_LESSON_IDS_KEY = "classroom_free_lesson_ids";
const FREE_FALLBACK_COUNT = 3;

export interface PublicLesson {
  id: number;
  title: string;
  description: string;
  transcript: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  pointsReward: number;
  displayOrder: number;
  createdAt: Date | null;
  /** True when the video is watchable without an account. */
  isFree: boolean;
}

async function readFreeIds(): Promise<number[] | null> {
  try {
    const [{ db }, { appSettings }, { eq }] = await Promise.all([
      import("@/lib/db"),
      import("@shared/schema.mysql"),
      import("drizzle-orm"),
    ]);

    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, FREE_LESSON_IDS_KEY));

    if (!row?.value) return null;

    const ids = row.value
      .split(",")
      .map((part) => parseInt(part.trim(), 10))
      .filter((n) => Number.isFinite(n));

    return ids.length > 0 ? ids : null;
  } catch {
    // Setting missing or table unreachable. Fall back to the default.
    return null;
  }
}

/**
 * Published lessons, ordered, with the free flag resolved.
 * Returns an empty array rather than throwing so a database problem degrades
 * the page instead of 500ing it.
 */
export async function getPublicLessons(): Promise<PublicLesson[]> {
  let videos;
  try {
    const { storage } = await import("@/lib/core/storage");
    videos = await storage.getClassroomVideos(true);
  } catch (error) {
    console.error("classroom: could not load published lessons:", error);
    return [];
  }

  const ordered = [...videos].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  );

  const configured = await readFreeIds();
  const freeSet = new Set(
    configured ?? ordered.slice(0, FREE_FALLBACK_COUNT).map((v) => v.id)
  );

  return ordered.map((v) => {
    const isFree = freeSet.has(v.id);
    return {
      id: v.id,
      title: v.title,
      description: v.description ?? "",
      transcript: v.transcript ?? "",
      thumbnailUrl: v.thumbnailUrl ?? null,
      // Never send the video URL for a gated lesson. Hiding the player in the
      // UI while shipping the URL in the HTML would not be a gate at all.
      videoUrl: isFree ? v.videoUrl : null,
      pointsReward: v.pointsReward ?? 0,
      displayOrder: v.displayOrder ?? 0,
      createdAt: v.createdAt ?? null,
      isFree,
    };
  });
}

export async function getPublicLesson(id: number): Promise<PublicLesson | null> {
  const lessons = await getPublicLessons();
  return lessons.find((l) => l.id === id) ?? null;
}

/** Rough read time from the transcript, for article schema. */
export function lessonReadMinutes(lesson: PublicLesson): number {
  const words = lesson.transcript.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
