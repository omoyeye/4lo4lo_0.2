import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";
import { isUnsafePublicUsername } from "@/lib/profile-visibility";

// GET /api/profile/:username  (Public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Same floor as the page. Without it this endpoint stays a way to confirm
    // that a given email address holds an account here, which is exactly the
    // disclosure the page guard exists to prevent.
    if (isUnsafePublicUsername(username)) {
      return NextResponse.json(
        { message: "Profile not found or private" },
        { status: 404 }
      );
    }

    const profile = await storage.getPublicProfile(username);
    if (!profile) {
      return NextResponse.json(
        { message: "Profile not found or private" },
        { status: 404 }
      );
    }

    /*
     * No sign-in requirement here, deliberately.
     *
     * This endpoint backs the profile page, which has to work for a visitor
     * arriving from a creator's TikTok bio with no account. Gating it on a
     * session broke exactly that. Enumeration is prevented by not ADVERTISING
     * profiles (no sitemap entry, noindex) plus the username floor above,
     * rather than by refusing to serve a URL somebody was given.
     */
    const u = profile.user;
    const safeUser = {
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
    };

    const links = await storage.getPublicProfileLinks(u.id);
    return NextResponse.json({ user: safeUser, badges: profile.badges, links });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { message: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
