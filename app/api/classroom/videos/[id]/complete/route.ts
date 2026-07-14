import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// POST /api/classroom/videos/:id/complete
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const { id } = await params;
    const videoId = parseInt(id, 10);
    if (isNaN(videoId)) {
      return NextResponse.json({ message: "Invalid video ID" }, { status: 400 });
    }

    const video = await storage.getClassroomVideo(videoId);
    if (!video || !video.isPublished) {
      return NextResponse.json({ message: "Video not found" }, { status: 404 });
    }

    const existing = await storage.getClassroomCompletion(userId, videoId);
    if (existing) {
      return NextResponse.json(
        { message: "Already completed", pointsEarned: 0 },
        { status: 409 }
      );
    }

    await storage.createClassroomCompletion({
      userId,
      videoId,
      pointsEarned: video.pointsReward,
    });
    await storage.updateUserPoints(userId, video.pointsReward);
    storage.checkAndAwardBadges(userId).catch(() => {});

    return NextResponse.json({ success: true, pointsEarned: video.pointsReward });
  } catch (error) {
    console.error("Failed to mark video as complete:", error);
    return NextResponse.json(
      { message: "Failed to mark video as complete" },
      { status: 500 }
    );
  }
}
