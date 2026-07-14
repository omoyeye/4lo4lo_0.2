import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/classroom/videos
export async function GET(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const videos = await storage.getClassroomVideos(true);
    const completions = await storage.getUserClassroomCompletions(userId);
    const completedVideoIds = new Set(completions.map((c) => c.videoId));
    const videosWithStatus = videos.map((v) => ({
      ...v,
      completed: completedVideoIds.has(v.id),
    }));
    return NextResponse.json(videosWithStatus);
  } catch (error) {
    console.error("Failed to fetch classroom videos:", error);
    return NextResponse.json(
      { message: "Failed to fetch classroom videos" },
      { status: 500 }
    );
  }
}
