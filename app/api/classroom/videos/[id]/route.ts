import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/classroom/videos/:id
export async function GET(
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

    const completion = await storage.getClassroomCompletion(userId, videoId);
    return NextResponse.json({ ...video, completed: !!completion });
  } catch (error) {
    console.error("Failed to fetch classroom video:", error);
    return NextResponse.json(
      { message: "Failed to fetch classroom video" },
      { status: 500 }
    );
  }
}
