import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertClassroomVideoSchema } from "@shared/schema.mysql";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/classroom/videos
 *
 * Unlike the public /api/classroom/videos, this returns unpublished and
 * scheduled lessons too — that is the whole point of the manager view.
 */
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const videos = await storage.getClassroomVideos(false);
    return NextResponse.json(videos, { status: 200 });
  } catch (error) {
    console.error("Failed to list classroom videos:", error);
    return NextResponse.json(
      { message: "Failed to list classroom videos" },
      { status: 500 }
    );
  }
}

// POST /api/admin/classroom/videos
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();

    // Accept ISO date strings from the form and coerce to Date.
    if (typeof body.scheduledPublishAt === "string" && body.scheduledPublishAt) {
      body.scheduledPublishAt = new Date(body.scheduledPublishAt);
    }
    if (body.scheduledPublishAt === "") body.scheduledPublishAt = null;

    const data = insertClassroomVideoSchema.parse(body);
    const video = await storage.createClassroomVideo(data);

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create classroom video:", error);
    return NextResponse.json(
      { message: "Failed to create classroom video" },
      { status: 500 }
    );
  }
}
