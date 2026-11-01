import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { db } from "@/lib/db";
import { classroomCompletions, users } from "@shared/schema.mysql";
import { and, eq } from "drizzle-orm";

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

    // The member's row lock serializes their completions, so two quick taps
    // can't both pass the "already completed" check and both be paid.
    const created = await db.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
      const [existing] = await tx
        .select({ id: classroomCompletions.id })
        .from(classroomCompletions)
        .where(and(eq(classroomCompletions.userId, userId), eq(classroomCompletions.videoId, videoId)));
      if (existing) return false;
      await tx.insert(classroomCompletions).values({ userId, videoId, pointsEarned: video.pointsReward });
      return true;
    });
    if (!created) {
      return NextResponse.json(
        { message: "Already completed", pointsEarned: 0 },
        { status: 409 }
      );
    }

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
