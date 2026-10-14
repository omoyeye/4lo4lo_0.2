import type { User } from "@shared/schema.mysql";

/**
 * Columns that must never leave the server, whoever is asking.
 *
 * - password: scrypt hash ("hex.salt"). Offline-crackable if leaked.
 * - googleId: the Google account subject used to sign in. No client reads it.
 */
type SecretUserColumn = "password" | "googleId";

export type PublicUser = Omit<User, SecretUserColumn>;

/**
 * A user row as the user themself (or an admin) may see it: every column
 * except the secrets above. Use this for /api/user, login, register, profile
 * updates and admin user management.
 */
export function toPublicUser(user: User): PublicUser {
  const { password: _password, googleId: _googleId, ...rest } = user;
  return rest;
}

/**
 * A user row as ANOTHER member may see it (top earners and similar lists).
 * Allowlist rather than denylist, so a column added to `users` later is not
 * exposed by default. Email, referral code, balances and preferences belong
 * to the account holder only.
 */
export function toPeerUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    country: user.country,
    points: user.points,
    level: user.level,
    globalRank: user.globalRank,
  };
}
