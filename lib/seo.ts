import type { Metadata } from "next";

/**
 * Central SEO helpers.
 *
 * Replaces components/SEO.tsx, which was a stub that returned `null`. Seven
 * pages imported it and passed it title/description props that went nowhere,
 * so every page on the site shared the single title and description declared
 * in app/layout.tsx. Search engines saw one page repeated.
 */

export const SITE_NAME = "4lo4lo";

export const SITE_DESCRIPTION =
  "Complete social media tasks, earn points, and grow your online presence. Free creator tools, a learning classroom, and a community of creators growing together.";

/**
 * Canonical origin, no trailing slash.
 *
 * ORDER MATTERS, AND IT BIT US ONCE ALREADY.
 *
 * NEXTAUTH_URL used to sit above the Vercel-provided production URL. That
 * variable is set to http://localhost:3000 in this project's Vercel
 * environment, so a production build baked `<link rel="canonical"
 * href="http://localhost:3000/...">` into every statically generated page.
 * A canonical pointing at localhost is worse than none at all: it tells search
 * engines the authoritative copy of the page lives somewhere they cannot
 * reach, and it breaks every link preview.
 *
 * So the resolution order is now:
 *   1. NEXT_PUBLIC_SITE_URL, an explicit deliberate override
 *   2. VERCEL_PROJECT_PRODUCTION_URL, which Vercel sets correctly on its own
 *   3. NEXTAUTH_URL, which is only trustworthy in local development
 *   4. localhost, for local development
 *
 * Set NEXT_PUBLIC_SITE_URL to your apex domain anyway. Without it a build
 * resolves to the *.vercel.app hostname, which splits ranking signals across
 * two hostnames even though both are reachable.
 */
export function siteUrl(): string {
  const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined;

  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    fromVercel ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const normalised = raw.replace(/\/+$/, "");

  // Fail loudly in the build log rather than shipping localhost canonicals.
  if (
    process.env.NODE_ENV === "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)/.test(normalised)
  ) {
    console.error(
      "[seo] Canonical origin resolved to " +
        normalised +
        " in a production build. Set NEXT_PUBLIC_SITE_URL to the public domain, " +
        "or canonical tags and Open Graph URLs will point at localhost."
    );
  }

  return normalised;
}

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** URL of the dynamically generated Open Graph image. */
export function ogImageUrl(params: {
  title: string;
  subtitle?: string;
  tag?: string;
}): string {
  const search = new URLSearchParams({ title: params.title });
  if (params.subtitle) search.set("subtitle", params.subtitle);
  if (params.tag) search.set("tag", params.tag);
  return absoluteUrl(`/api/og?${search.toString()}`);
}

export interface PageSeoInput {
  title: string;
  description: string;
  /** Site-relative path, e.g. "/free-tools/hashtag-generator". */
  path: string;
  keywords?: string[];
  /** Set false for pages that should stay out of the index. */
  index?: boolean;
  ogTag?: string;
  ogSubtitle?: string;
  type?: "website" | "article" | "profile";
}

/**
 * Build a complete Metadata object: canonical, OG, Twitter card and robots.
 * Use from a server component's `metadata` export or `generateMetadata`.
 */
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  index = true,
  ogTag,
  ogSubtitle,
  type = "website",
}: PageSeoInput): Metadata {
  const url = absoluteUrl(path);
  const image = ogImageUrl({
    title,
    subtitle: ogSubtitle ?? description,
    tag: ogTag,
  });

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: type === "profile" ? "profile" : type,
      url,
      title,
      description,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/** JSON-LD helper. Render inside a <script type="application/ld+json">. */
export function jsonLd(data: Record<string, unknown>): string {
  // Escape `<` so a value containing "</script>" cannot break out of the tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
