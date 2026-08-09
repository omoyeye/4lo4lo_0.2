import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { STANDALONE_TOOLS } from "@/lib/tools-registry";

/*
 * `db` is imported lazily inside the try block below, not at module scope.
 *
 * lib/db.ts throws when DATABASE_URL is absent, and a module-scope import
 * makes that throw before the handler runs — which took down the entire
 * sitemap, static routes included, rather than just the profile section it
 * actually affects. A sitemap missing its profiles still tells search engines
 * about the tool pages; a 500 tells them nothing.
 */

/**
 * Sitemap.
 *
 * Public profiles are the bulk of it: every creator who fills in their profile
 * links has a page worth indexing, and each one is a page we did not have to
 * write. Capped so the file stays inside the 50,000-URL / 50MB limit — split
 * into a sitemap index if you ever approach that.
 */

export const revalidate = 3600; // rebuild hourly

const PROFILE_LIMIT = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/free-tools"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/leaderboard"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/classroom"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/support"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/signup"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/login"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const toolRoutes: MetadataRoute.Sitemap = STANDALONE_TOOLS.map((tool) => ({
    url: absoluteUrl(`/free-tools/${tool.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  let profileRoutes: MetadataRoute.Sitemap = [];
  try {
    const [{ db }, { users }, { and, eq, isNotNull, desc }] = await Promise.all([
      import("@/lib/db"),
      import("@shared/schema.mysql"),
      import("drizzle-orm"),
    ]);

    const rows = await db
      .select({ username: users.username, updatedAt: users.updatedAt })
      .from(users)
      .where(and(eq(users.isPublic, true), isNotNull(users.username)))
      .orderBy(desc(users.updatedAt))
      .limit(PROFILE_LIMIT);

    profileRoutes = rows.map((row) => ({
      url: absoluteUrl(`/profile/${encodeURIComponent(row.username)}`),
      lastModified: row.updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (error) {
    // A sitemap missing its profile section is far better than a 500 that
    // makes search engines drop the whole file.
    console.error("sitemap: could not load public profiles:", error);
  }

  return [...staticRoutes, ...toolRoutes, ...profileRoutes];
}
