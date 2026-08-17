import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { STANDALONE_TOOLS } from "@/lib/tools-registry";
import { GUIDES } from "@/lib/learn-content";

/*
 * `db` is imported lazily inside the try block below, not at module scope.
 *
 * lib/db.ts throws when DATABASE_URL is absent, and a module-scope import
 * makes that throw before the handler runs, which took down the entire
 * sitemap, static routes included, rather than just the profile section it
 * actually affects. A sitemap missing its profiles still tells search engines
 * about the tool pages; a 500 tells them nothing.
 */

/**
 * Sitemap.
 *
 * Public profiles are the bulk of it: every creator who fills in their profile
 * links has a page worth indexing, and each one is a page we did not have to
 * write. Capped so the file stays inside the 50,000-URL / 50MB limit, split
 * into a sitemap index if you ever approach that.
 */

export const revalidate = 3600; // rebuild hourly

const PROFILE_LIMIT = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/free-tools"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/learn"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/leaderboard"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/classroom"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/support"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/auth"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const toolRoutes: MetadataRoute.Sitemap = STANDALONE_TOOLS.map((tool) => ({
    url: absoluteUrl(`/free-tools/${tool.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const guideRoutes: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: absoluteUrl(`/learn/${guide.slug}`),
    lastModified: new Date(guide.updated ?? guide.published),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // Published classroom lessons are public pages, so they belong here too.
  let lessonRoutes: MetadataRoute.Sitemap = [];
  try {
    const { getPublicLessons } = await import("@/lib/classroom-public");
    const lessons = await getPublicLessons();
    lessonRoutes = lessons.map((lesson) => ({
      url: absoluteUrl(`/learn/lessons/${lesson.id}`),
      lastModified: lesson.createdAt ?? now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error("sitemap: could not load classroom lessons:", error);
  }

  /*
   * Only profiles whose owner opted in to being on the public web.
   *
   * This used to list everyone with is_public, which is every account, and so
   * published the entire member list. listIndexableUsernames requires both
   * is_public and is_indexable, drops usernames that must never be published,
   * and returns an empty list on any failure, including before the migration
   * that adds the column has been run.
   */
  let profileRoutes: MetadataRoute.Sitemap = [];
  try {
    const { listIndexableUsernames } = await import("@/lib/profile-visibility");
    const usernames = await listIndexableUsernames(PROFILE_LIMIT);

    profileRoutes = usernames.map((username) => ({
      url: absoluteUrl(`/profile/${encodeURIComponent(username)}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (error) {
    // A sitemap missing its profile section is far better than a 500 that
    // makes search engines drop the whole file.
    console.error("sitemap: could not load indexable profiles:", error);
  }

  return [...staticRoutes, ...toolRoutes, ...guideRoutes, ...lessonRoutes, ...profileRoutes];
}
