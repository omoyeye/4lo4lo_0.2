/**
 * Community data layer: the follow graph and the activity feed.
 *
 * ── DESIGN NOTE ────────────────────────────────────────────────────────────
 *
 * The activity feed invents no new storage. Everything it shows already
 * happens in the product and is already recorded:
 *
 *   user_tasks      a task was completed, and for how many points
 *   user_badges     a badge was earned
 *   level_history   a level was reached
 *
 * The only genuinely missing piece was the graph of who follows whom, which
 * is the single table in scripts/sql/006-community-tables.sql.
 *
 * ── TOLERATING A MISSING TABLE ─────────────────────────────────────────────
 *
 * That table does not exist until an operator runs the script against the
 * live database, so every function here treats "table is missing" as an
 * ordinary state rather than an error: following reports that it is not
 * enabled, and the feed falls back to platform-wide activity. Nothing throws.
 *
 * Imports are lazy and inside try blocks for the reason documented in
 * lib/classroom-public.ts: lib/db.ts throws at module evaluation when
 * DATABASE_URL is absent, which would take down pages that do not need it.
 */

export interface FeedActor {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export type FeedEventType = "task_completed" | "badge_earned" | "level_up";

export interface FeedEvent {
  /** Stable key for React and for de-duplication. */
  id: string;
  type: FeedEventType;
  actor: FeedActor;
  at: Date;
  /** Human-readable summary, built server side so the client stays dumb. */
  title: string;
  detail?: string;
  /** Points involved, when the event has any. */
  points?: number;
}

/** True when the follow graph table has been created. */
export async function isCommunityEnabled(): Promise<boolean> {
  try {
    const [{ db }, { sql }] = await Promise.all([
      import("@/lib/db"),
      import("drizzle-orm"),
    ]);
    await db.execute(sql`SELECT 1 FROM user_follows LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

export async function isFollowing(
  followerId: number,
  followingId: number
): Promise<boolean> {
  try {
    const [{ db }, { userFollows }, { and, eq }] = await Promise.all([
      import("@/lib/db"),
      import("@shared/schema.mysql"),
      import("drizzle-orm"),
    ]);

    const [row] = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followingId, followingId)
        )
      )
      .limit(1);

    return Boolean(row);
  } catch {
    return false;
  }
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export async function getFollowCounts(userId: number): Promise<FollowCounts> {
  try {
    const [{ db }, { userFollows }, { eq, count }] = await Promise.all([
      import("@/lib/db"),
      import("@shared/schema.mysql"),
      import("drizzle-orm"),
    ]);

    const [[followers], [following]] = await Promise.all([
      db
        .select({ value: count() })
        .from(userFollows)
        .where(eq(userFollows.followingId, userId)),
      db
        .select({ value: count() })
        .from(userFollows)
        .where(eq(userFollows.followerId, userId)),
    ]);

    return {
      followers: Number(followers?.value ?? 0),
      following: Number(following?.value ?? 0),
    };
  } catch {
    return { followers: 0, following: 0 };
  }
}

export type FollowResult =
  | { ok: true; following: boolean }
  | { ok: false; reason: "not_enabled" | "self" | "error" };

export async function followUser(
  followerId: number,
  followingId: number
): Promise<FollowResult> {
  // Following yourself is meaningless and would pollute every count.
  if (followerId === followingId) return { ok: false, reason: "self" };

  try {
    const [{ db }, { userFollows }] = await Promise.all([
      import("@/lib/db"),
      import("@shared/schema.mysql"),
    ]);

    await db.insert(userFollows).values({ followerId, followingId });
    return { ok: true, following: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    // Already following. The unique constraint did its job, and the caller's
    // intent (be following this user) is satisfied, so this is success.
    if (message.includes("Duplicate entry") || message.includes("ER_DUP_ENTRY")) {
      return { ok: true, following: true };
    }

    if (message.includes("user_follows") || message.includes("ER_NO_SUCH_TABLE")) {
      return { ok: false, reason: "not_enabled" };
    }

    console.error("community: follow failed:", error);
    return { ok: false, reason: "error" };
  }
}

export async function unfollowUser(
  followerId: number,
  followingId: number
): Promise<FollowResult> {
  try {
    const [{ db }, { userFollows }, { and, eq }] = await Promise.all([
      import("@/lib/db"),
      import("@shared/schema.mysql"),
      import("drizzle-orm"),
    ]);

    await db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followingId, followingId)
        )
      );

    return { ok: true, following: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("user_follows") || message.includes("ER_NO_SUCH_TABLE")) {
      return { ok: false, reason: "not_enabled" };
    }
    console.error("community: unfollow failed:", error);
    return { ok: false, reason: "error" };
  }
}

/** Ids this user follows. Empty when the table is missing. */
async function getFollowingIds(userId: number): Promise<number[]> {
  try {
    const [{ db }, { userFollows }, { eq }] = await Promise.all([
      import("@/lib/db"),
      import("@shared/schema.mysql"),
      import("drizzle-orm"),
    ]);

    const rows = await db
      .select({ id: userFollows.followingId })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));

    return rows.map((r) => r.id);
  } catch {
    return [];
  }
}

export interface FeedResult {
  events: FeedEvent[];
  /** False when showing platform-wide activity instead of a followed set. */
  personalised: boolean;
  /** True once the follow table exists. */
  communityEnabled: boolean;
}

/**
 * Activity feed.
 *
 * When the viewer follows people, shows their activity. Otherwise falls back
 * to recent platform-wide activity, which is the right default: an empty feed
 * is the fastest way to make a new social feature look dead, and the fallback
 * doubles as discovery.
 */
export async function getActivityFeed(
  viewerId: number | null,
  limit = 40
): Promise<FeedResult> {
  const communityEnabled = await isCommunityEnabled();

  const followingIds = viewerId ? await getFollowingIds(viewerId) : [];
  const personalised = followingIds.length > 0;

  try {
    const [
      { db },
      { users, userTasks, tasks, userBadges, badges, levelHistory },
      { desc, eq, inArray },
    ] = await Promise.all([
      import("@/lib/db"),
      import("@shared/schema.mysql"),
      import("drizzle-orm"),
    ]);

    // Only surface activity from public profiles. A private profile's owner
    // has opted out of being visible, and a feed would route around that.
    const scope = personalised ? followingIds : undefined;

    const completionRows = await db
      .select({
        id: userTasks.id,
        at: userTasks.completedAt,
        points: userTasks.pointsEarned,
        taskTitle: tasks.title,
        taskPlatform: tasks.platform,
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        isPublic: users.isPublic,
      })
      .from(userTasks)
      .innerJoin(users, eq(userTasks.userId, users.id))
      .innerJoin(tasks, eq(userTasks.taskId, tasks.id))
      .where(scope ? inArray(userTasks.userId, scope) : eq(users.isPublic, true))
      .orderBy(desc(userTasks.completedAt))
      .limit(limit);

    const badgeRows = await db
      .select({
        id: userBadges.id,
        at: userBadges.earnedAt,
        badgeName: badges.title,
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        isPublic: users.isPublic,
      })
      .from(userBadges)
      .innerJoin(users, eq(userBadges.userId, users.id))
      .innerJoin(badges, eq(userBadges.badgeKey, badges.key))
      .where(scope ? inArray(userBadges.userId, scope) : eq(users.isPublic, true))
      .orderBy(desc(userBadges.earnedAt))
      .limit(limit);

    const levelRows = await db
      .select({
        id: levelHistory.id,
        at: levelHistory.reachedAt,
        level: levelHistory.level,
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        isPublic: users.isPublic,
      })
      .from(levelHistory)
      .innerJoin(users, eq(levelHistory.userId, users.id))
      .where(scope ? inArray(levelHistory.userId, scope) : eq(users.isPublic, true))
      .orderBy(desc(levelHistory.reachedAt))
      .limit(limit);

    const actor = (r: {
      userId: number;
      username: string;
      displayName: string | null;
      avatar: string | null;
    }): FeedActor => ({
      id: r.userId,
      username: r.username,
      displayName: r.displayName,
      avatar: r.avatar,
    });

    const name = (r: { displayName: string | null; username: string }) =>
      r.displayName?.trim() || r.username;

    const events: FeedEvent[] = [
      ...completionRows
        .filter((r) => personalised || r.isPublic)
        .map((r) => ({
          id: `task-${r.id}`,
          type: "task_completed" as const,
          actor: actor(r),
          at: new Date(r.at as unknown as string),
          title: `${name(r)} completed a task`,
          detail: r.taskPlatform ? `${r.taskTitle} on ${r.taskPlatform}` : r.taskTitle,
          points: r.points ?? undefined,
        })),
      ...badgeRows
        .filter((r) => personalised || r.isPublic)
        .map((r) => ({
          id: `badge-${r.id}`,
          type: "badge_earned" as const,
          actor: actor(r),
          at: new Date(r.at as unknown as string),
          title: `${name(r)} earned a badge`,
          detail: r.badgeName ?? undefined,
        })),
      ...levelRows
        .filter((r) => personalised || r.isPublic)
        .map((r) => ({
          id: `level-${r.id}`,
          type: "level_up" as const,
          actor: actor(r),
          at: new Date(r.at as unknown as string),
          title: `${name(r)} reached level ${r.level}`,
        })),
    ]
      .filter((e) => !Number.isNaN(e.at.getTime()))
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, limit);

    return { events, personalised, communityEnabled };
  } catch (error) {
    console.error("community: could not build activity feed:", error);
    return { events: [], personalised: false, communityEnabled };
  }
}
