import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";

// GET /api/profile/:username  (Public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const profile = await storage.getPublicProfile(username);
    if (!profile) {
      return NextResponse.json(
        { message: "Profile not found or private" },
        { status: 404 }
      );
    }

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
