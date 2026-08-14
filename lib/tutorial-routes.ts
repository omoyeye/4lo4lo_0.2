/**
 * Where the product tour is allowed to appear.
 *
 * The tour was mounted in app/providers.tsx, which wraps every route, and was
 * gated only on `user` being present. A signed-in visitor reading /learn or
 * /free-tools therefore got the "New Here?" prompt on a public marketing page.
 *
 * Being gated on login is necessary but not sufficient, because every step of
 * the tour targets an element that only exists inside the signed-in app:
 *
 *   dashboard-stats                         WelcomeSection, /dashboard only
 *   sidebar, tasks-link, rewards-link,
 *   referral-link, settings-link            components/layout/Sidebar
 *   platform-filters, task-list             /tasks
 *
 * None of those render on the public pages, so starting the tour there would
 * highlight nothing. An allowlist is used rather than a denylist so that a new
 * public page is excluded by default: forgetting to add a route here shows no
 * tour, whereas forgetting to add it to a denylist leaks the tour onto a
 * marketing page, which is the bug being fixed.
 */

/** Route prefixes that render the signed-in app shell. */
const TUTORIAL_ROUTES = [
  "/dashboard",
  "/tasks",
  "/rewards",
  "/referral",
  "/settings",
  "/classroom",
  "/marketplace",
  "/payments",
  "/promote-me",
  "/notifications",
  "/tools",
] as const;

/**
 * Note on near-misses:
 *  - "/leaderboard" is signed-in but the tour never references it.
 *  - "/tools" is the signed-in tools page. "/free-tools" is the public one and
 *    is deliberately NOT matched, which the startsWith check below handles
 *    because it anchors on a leading slash.
 *  - "/profile/[username]" is a public, search-indexed page even for signed-in
 *    visitors, so it stays out.
 */
export function isTutorialRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  return TUTORIAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
