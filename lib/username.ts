/**
 * Rule for new usernames (sign-up and username changes). Usernames end up in
 * profile URLs and @mentions, so they're kept to URL-safe characters. Accounts
 * created before this rule keep their names; it applies only when one is set.
 */
export const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,30}$/;

export function usernameProblem(name: string): string | null {
  if (name.length < 3) return "Username must be at least 3 characters";
  if (name.length > 30) return "Username can be at most 30 characters";
  if (!USERNAME_PATTERN.test(name)) return "Usernames can use letters, numbers, dots, dashes and underscores";
  // deleted_<id> is what account deletion renames people to.
  if (/^deleted[_-]/i.test(name)) return "That username isn't available";
  return null;
}
