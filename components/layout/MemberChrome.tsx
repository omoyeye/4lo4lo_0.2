"use client";

import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/Sidebar";

/**
 * The app sidebar, but only for signed-in members, decided in the browser.
 *
 * WHY CLIENT SIDE: the profile page is cached and shared by every viewer
 * (revalidate = 3600). Anything session-dependent rendered on the server would
 * be baked into that shared copy, so one visitor's chrome would be served to
 * everyone, including signed-out visitors. An earlier attempt to make that
 * page session-aware on the server is what broke every creator's link in bio.
 *
 * Deciding it here keeps the cached HTML identical for all viewers. The
 * sidebar appears once the browser knows who is looking, which costs a small
 * shift on first paint and is worth it to keep the page cacheable.
 *
 * The two audiences this serves:
 *
 *   member          arrives from the app, keeps the navigation and the way to
 *                   sign out, same as every other page.
 *   public visitor  arrives from a creator's TikTok bio with no account. Shows
 *                   nothing, because an app menu is a list of pages they
 *                   cannot open.
 *
 * Pages using this need `flex flex-col md:flex-row` on the wrapper and
 * `pb-20 md:pb-0` on the content, since on mobile Sidebar renders a fixed
 * bottom bar that would otherwise cover the end of the page.
 */
export function MemberChrome() {
  const { user } = useAuth();

  if (!user) return null;

  return <Sidebar />;
}
