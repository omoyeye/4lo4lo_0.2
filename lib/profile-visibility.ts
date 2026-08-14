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
