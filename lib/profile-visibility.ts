/**
 * Whether a username is safe to publish as a public URL.
 *
 * WHY THIS EXISTS: usernames are validated only as `min(3)`, with no character
 * rules, so an email address is a perfectly valid username. One account signed
 * up that way, and because profiles were public by default its address was
 * published as https://4lo4lo.site/profile/<their-email>, rendered on the page
 * as their handle and submitted to search engines in the sitemap. That is a
 * personal data leak, and a durable one: an indexed address stays scrapeable
 * long after the page itself changes.
 *
 * `is_public` is the user's own choice and is checked separately. This is the
 * operator-side floor underneath it, so even a user who deliberately opts in
 * does not get their email address turned into an indexed page.
 *
 * Applied at all three public surfaces, so there is no way round it:
 *   app/sitemap.ts                       excluded from the sitemap
 *   app/profile/[username]/page.tsx      404
 *   app/api/profile/[username]/route.ts  404
 *
 * This deliberately does NOT reject at signup. Blocking these at registration
 * is worth doing, but it is a separate change with its own failure mode, and
 * existing accounts would still need this guard regardless.
 */

/**
 * Names that must never resolve to a public profile page.
 *
 * `admin` is the one that mattered: it was live in the sitemap, which handed an
 * attacker the username half of the credentials for /admin/login. The rest are
 * role accounts that would imply staff identity if someone registered them.
 */
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "superadmin",
  "moderator",
  "mod",
  "staff",
  "support",
  "help",
  "system",
  "security",
  "billing",
  "noreply",
  "no-reply",
  "postmaster",
  "webmaster",
  "4lo4lo",
]);

/**
 * What a publishable username may contain.
 *
 * An allowlist, not a list of banned characters. Blocklisting was the first
 * attempt and it is the wrong shape here: it has to anticipate every hostile
 * character (@ for addresses, spaces, slashes, control characters, and the
 * Unicode confusables used for impersonation), and anything overlooked ships.
 * This inverts that. Only these characters are publishable and everything else
 * withholds the page, so a character nobody thought about fails closed.
 *
 * Length is capped at 30 to match the existing profile-update schema.
 */
const PUBLISHABLE_USERNAME = /^[A-Za-z0-9][A-Za-z0-9._-]{1,28}[A-Za-z0-9]$/;

/**
 * True when the username must not be published, whatever `is_public` says.
 *
 * Rejects anything outside the allowlist above, which covers email-shaped
 * names, names containing whitespace (the live sitemap carried
 * `/profile/Gracious%20Mandate%20`, where the trailing space is invisible and
 * makes the link unshareable), path and control characters, and anything that
 * would not survive a round trip through a URL. Reserved role names are
 * rejected on top of that.
 */
export function isUnsafePublicUsername(username: string | null | undefined): boolean {
  if (!username) return true;
  if (username !== username.trim()) return true;
  if (!PUBLISHABLE_USERNAME.test(username)) return true;
  if (RESERVED_USERNAMES.has(username.toLowerCase())) return true;

  return false;
}

/** Convenience inverse, for filtering lists. */
export function isPublishableUsername(username: string | null | undefined): boolean {
  return !isUnsafePublicUsername(username);
}

/* -------------------------------------------------------------------------
 * Two different questions, previously answered by one flag
 *
 * `users.is_public` used to mean both "other members can see me" and "publish
 * me to the open web". Collapsing those forced a bad trade: making profiles
 * private to stop search engines indexing the member list would also have shut
 * down the follow button and the activity feed, since both gate on the same
 * column.
 *
 * They are now separate:
 *
 *   is_public     the user has a profile page at all. Anyone holding the URL
 *                 can open it, account or not, which is what makes a bio link
 *                 work. Members can additionally follow them and see them in
 *                 the feed. Defaults to true.
 *
 *   is_indexable  the page is ADVERTISED: listed in sitemap.xml and allowed
 *                 into search results. Defaults to FALSE, so turning up in
 *                 Google is something a user asks for.
 *
 * is_indexable controls ADVERTISING, never ACCESS. An earlier version of this
 * file used it to refuse the page to signed-out visitors, which killed every
 * creator's link-in-bio: their audience has no account here, and that traffic
 * is the entire point of the feature. Unlisted is not the same as unreachable,
 * and enumeration is prevented by the first, not the second.
 *
 * Both flags are required to be listed. is_indexable alone means nothing,
 * since a user with no profile page has nothing to advertise.
 *
 * COLUMN MAY NOT EXIST YET. is_indexable is added by
 * scripts/sql/007-profile-indexing.sql, which a human runs against the live
 * database. Until then every read here returns false, so the site behaves as
 * if nobody has opted in: correct, and safe in the direction that matters.
 *
 * It is deliberately NOT in the Drizzle users schema. Drizzle expands
 * `select().from(users)` into an explicit column list, so declaring a column
 * that does not exist yet would break every query against the users table,
 * including sign in. Reading it by raw SQL keeps the failure contained to this
 * file.
 * ------------------------------------------------------------------------- */

/** Rows come back as an array whose shape varies by driver. */
function firstRow(result: unknown): Record<string, unknown> | null {
  const rows = Array.isArray(result) ? result[0] : null;
  if (Array.isArray(rows)) return (rows[0] as Record<string, unknown>) ?? null;
  if (rows && typeof rows === "object") return rows as Record<string, unknown>;
  return null;
}

function truthy(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

/**
 * Whether this user has opted in to being listed in search engines.
 *
 * Fails closed. A missing column, an unreachable database or any other error
 * returns false, which means the page renders normally but carries noindex and
 * stays out of the sitemap. The failure direction is "not advertised", never
 * "not reachable", so a database hiccup can never break a creator's bio link.
 */
export async function isUserIndexable(userId: number): Promise<boolean> {
  try {
    const [{ db }, { sql }] = await Promise.all([
      import("@/lib/db"),
      import("drizzle-orm"),
    ]);

    const result = await db.execute(
      sql`SELECT is_public, is_indexable FROM users WHERE id = ${userId} LIMIT 1`
    );
    const row = firstRow(result);
    if (!row) return false;

    return truthy(row.is_public) && truthy(row.is_indexable);
  } catch {
    return false;
  }
}

/**
 * Usernames that may appear in sitemap.xml.
 *
 * Returns an empty list on any failure, which drops the profile section from
 * the sitemap. A sitemap missing a section is a far smaller problem than one
 * listing people who did not opt in.
 */
export async function listIndexableUsernames(limit: number): Promise<string[]> {
  try {
    const [{ db }, { sql }] = await Promise.all([
      import("@/lib/db"),
      import("drizzle-orm"),
    ]);

    const result = await db.execute(
      sql`SELECT username FROM users
          WHERE is_public = 1 AND is_indexable = 1 AND username IS NOT NULL
          ORDER BY updated_at DESC
          LIMIT ${limit}`
    );

    const rows = Array.isArray(result) ? result[0] : null;
    if (!Array.isArray(rows)) return [];

    return rows
      .map((r) => (r as { username?: unknown }).username)
      .filter((u): u is string => typeof u === "string")
      .filter(isPublishableUsername);
  } catch {
    return [];
  }
}

/**
 * Set the indexing preference. Returns false when the column is not there yet,
 * so the caller can tell the user why nothing happened instead of reporting a
 * save that did not occur.
 */
export async function setUserIndexable(
  userId: number,
  indexable: boolean
): Promise<boolean> {
  try {
    const [{ db }, { sql }] = await Promise.all([
      import("@/lib/db"),
      import("drizzle-orm"),
    ]);

    await db.execute(
      sql`UPDATE users SET is_indexable = ${indexable ? 1 : 0} WHERE id = ${userId} LIMIT 1`
    );
    return true;
  } catch {
    return false;
  }
}

/** True once scripts/sql/007-profile-indexing.sql has been run. */
export async function isIndexingEnabled(): Promise<boolean> {
  try {
    const [{ db }, { sql }] = await Promise.all([
      import("@/lib/db"),
      import("drizzle-orm"),
    ]);
    await db.execute(sql`SELECT is_indexable FROM users LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}
