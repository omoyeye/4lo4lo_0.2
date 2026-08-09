import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storage } from "@/lib/core/storage";
import ProfileClient from "@/components/profile/ProfileClient";
import { pageMetadata, jsonLd, absoluteUrl, SITE_NAME } from "@/lib/seo";

/**
 * Public creator profile — server-rendered.
 *
 * This is the growth surface: every creator who puts their profile link in a
 * social bio sends real traffic here, and each profile is a page we did not
 * have to write. It only works if search engines and link scrapers can read
 * it, which means the data has to be fetched on the server.
 *
 * Previously this route was a client component that fetched via useQuery, so
 * the server-rendered HTML was a loading skeleton — no title, no name, no
 * links. The data is now loaded here and handed to the client component as
 * `initialProfile`, which both fills the SSR HTML and removes the loading
 * flash for real users.
 *
 * Profiles are public by default (`users.is_public` defaults to true). A user
 * who turns that off 404s here, and getPublicProfile enforces it.
 */

// Profiles change when their owner edits them; an hour is a reasonable
// compromise between freshness and hammering the database from crawlers.
export const revalidate = 3600;

type Params = { params: Promise<{ username: string }> };

/** Shared loader so generateMetadata and the page don't query twice. */
async function loadProfile(rawUsername: string) {
  const username = decodeURIComponent(rawUsername);
  try {
    const profile = await storage.getPublicProfile(username);
    if (!profile) return null;

    const links = await storage.getPublicProfileLinks(profile.user.id).catch(() => []);
    return { profile, links };
  } catch (error) {
    console.error("profile page: failed to load", username, error);
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const data = await loadProfile(username);

  if (!data) {
    return pageMetadata({
      title: "Profile not found",
      description: "This profile does not exist or is set to private.",
      path: `/profile/${username}`,
      index: false,
    });
  }

  const u = data.profile.user;
  const name = u.displayName?.trim() || u.username;
  const badgeCount = data.profile.badges.length;

  const descriptionParts = [
    `${name} on ${SITE_NAME}.`,
    `Level ${u.level ?? 1}`,
    badgeCount > 0 ? `${badgeCount} badge${badgeCount === 1 ? "" : "s"}` : null,
    u.streakCount ? `${u.streakCount}-day streak` : null,
    u.country ? `Based in ${u.country}` : null,
    "See their links and follow their growth.",
  ].filter(Boolean);

  return pageMetadata({
    title: `${name} (@${u.username})`,
    description: descriptionParts.join(" · ").slice(0, 300),
    path: `/profile/${encodeURIComponent(u.username)}`,
    type: "profile",
    ogTag: `Level ${u.level ?? 1}`,
    ogSubtitle: `@${u.username}${u.country ? ` · ${u.country}` : ""}`,
    keywords: [u.username, name, "creator profile", `${name} social links`],
  });
}

export default async function Page({ params }: Params) {
  const { username } = await params;
  const data = await loadProfile(username);

  // A private or missing profile should be a real 404, not a soft 200 with an
  // error message — otherwise search engines index the error page.
  if (!data) notFound();

  const u = data.profile.user;
  const name = u.displayName?.trim() || u.username;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateCreated: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
    mainEntity: {
      "@type": "Person",
      name,
      alternateName: u.username,
      identifier: u.username,
      url: absoluteUrl(`/profile/${encodeURIComponent(u.username)}`),
      image: u.avatar || undefined,
      ...(u.country ? { homeLocation: { "@type": "Place", name: u.country } } : {}),
      // Their own links are the outbound signal that makes this page useful.
      sameAs: data.links.map((l) => l.url).filter(Boolean),
    },
  };

  const initialProfile = {
    user: {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatar: u.avatar,
      country: u.country,
      points: u.points,
      level: u.level,
      streakCount: u.streakCount,
      globalRank: u.globalRank,
      facebook_handle: u.facebook_handle,
      instagram_handle: u.instagram_handle,
      tiktok_handle: u.tiktok_handle,
      youtube_handle: u.youtube_handle,
      isPublic: u.isPublic,
      createdAt: u.createdAt,
    },
    badges: data.profile.badges,
    links: data.links,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <ProfileClient initialProfile={initialProfile as never} />
    </>
  );
}
