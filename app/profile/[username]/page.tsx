import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storage } from "@/lib/core/storage";
import ProfileClient from "@/components/profile/ProfileClient";
import { FollowButton } from "@/components/community/FollowButton";
import { getFollowCounts } from "@/lib/core/community";
import { pageMetadata, jsonLd, absoluteUrl, SITE_NAME } from "@/lib/seo";
import { isUnsafePublicUsername, isUserIndexable } from "@/lib/profile-visibility";
import { auth } from "@/auth";

/**
 * Public creator profile, server-rendered.
 *
 * This is the growth surface: every creator who puts their profile link in a
 * social bio sends real traffic here, and each profile is a page we did not
 * have to write. It only works if search engines and link scrapers can read
 * it, which means the data has to be fetched on the server.
 *
 * Previously this route was a client component that fetched via useQuery, so
 * the server-rendered HTML was a loading skeleton, no title, no name, no
 * links. The data is now loaded here and handed to the client component as
 * `initialProfile`, which both fills the SSR HTML and removes the loading
 * flash for real users.
 *
 * WHO CAN SEE THIS PAGE
 *
 *   signed-in member    any profile with is_public, which is the default. This
 *                       keeps profile browsing, following and the feed working.
 *   signed-out visitor  only profiles whose owner opted in to is_indexable.
 *                       Everything else 404s.
 *
 * So the member list is no longer on the open web, while the community still
 * functions. Search engines crawl signed out, so they see exactly the opted-in
 * set, and non-indexed profiles additionally carry robots noindex in case one
 * is reached some other way.
 *
 * lib/profile-visibility.ts sits underneath both as a floor that opting in
 * cannot override: email-shaped and reserved usernames never render.
 */

/*
 * Dynamic, not ISR.
 *
 * This page used to be cached for an hour, which is no longer possible now
 * that what it renders depends on whether the viewer is signed in: a cached
 * copy would serve one audience's version to the other, and the direction that
 * fails is a member's page being handed to an anonymous visitor.
 *
 * The cost is a database read per view, which is the right trade at this scale
 * and is the same read the page already did.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ username: string }> };

/** Shared loader so generateMetadata and the page don't query twice. */
async function loadProfile(rawUsername: string) {
  const username = decodeURIComponent(rawUsername);

  // Checked before the query, not after. An email-shaped or reserved username
  // must not produce a page even if its owner has opted in, and refusing here
  // means the address never reaches metadata, JSON-LD or the rendered handle.
  if (isUnsafePublicUsername(username)) return null;

  try {
    // getPublicProfile enforces is_public, so a profile hidden from members is
    // already excluded here for every audience.
    const profile = await storage.getPublicProfile(username);
    if (!profile) return null;

    const [links, indexable, viewer] = await Promise.all([
      storage.getPublicProfileLinks(profile.user.id).catch(() => []),
      isUserIndexable(profile.user.id),
      auth().catch(() => null),
    ]);

    // The one rule that separates the two audiences. A signed-out visitor,
    // which includes every search engine crawler, only ever sees profiles
    // whose owner asked to be on the public web.
    const signedIn = Boolean(viewer?.user?.id);
    if (!indexable && !signedIn) return null;

    return { profile, links, indexable };
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
    // Belt and braces. A member-only profile is already unreachable while
    // signed out, so a crawler should never get this far, but if one does by
    // some other route it is told not to index rather than relying on the
    // 404 alone.
    index: data.indexable,
  });
}

export default async function Page({ params }: Params) {
  const { username } = await params;
  const data = await loadProfile(username);

  // A private or missing profile should be a real 404, not a soft 200 with an
  // error message, otherwise search engines index the error page.
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

  /*
   * Follower count is the same for every viewer, so it is safe to resolve here
   * and be cached along with the page.
   *
   * Whether YOU follow this person is not. This page sets revalidate = 3600
   * because it is the site's main SEO surface and must stay cacheable, and
   * anything read from the session inside a cached render would either force
   * the page dynamic or, worse, cache one viewer's follow state and serve it
   * to everyone. So FollowButton resolves that part client side.
   */
  const counts = await getFollowCounts(u.id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />

      <div className="mx-auto max-w-4xl px-4 pt-6">
        <FollowButton username={u.username} initialFollowers={counts.followers} />
      </div>

      <ProfileClient initialProfile={initialProfile as never} />
    </>
  );
}
