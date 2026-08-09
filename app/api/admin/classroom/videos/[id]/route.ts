import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertClassroomVideoSchema } from "@shared/schema.mysql";
import { z } from "zod";

const patchSchema = insertClassroomVideoSchema.partial();

// PATCH /api/admin/classroom/videos/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const videoId = parseInt(id, 10);
    if (isNaN(videoId)) {
      return NextResponse.json({ message: "Invalid video ID" }, { status: 400 });
    }

    const existing = await storage.getClassroomVideo(videoId);
    if (!existing) {
      return NextResponse.json({ message: "Video not found" }, { status: 404 });
    }

    const body = await req.json();

    if (typeof body.scheduledPublishAt === "string" && body.scheduledPublishAt) {
      body.scheduledPublishAt = new Date(body.scheduledPublishAt);
    }

    // The manager clears scheduledPublishAt to mean "publish now", honour that
    // explicitly rather than leaving a scheduled lesson stuck unpublished.
    if (body.scheduledPublishAt === null && body.isPublished === undefined) {
      body.isPublished = true;
    }

    const data = patchSchema.parse(body);
    const updated = await storage.updateClassroomVideo(videoId, data);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to update classroom video:", error);
    return NextResponse.json(
      { message: "Failed to update classroom video" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/classroom/videos/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const videoId = parseInt(id, 10);
    if (isNaN(videoId)) {
      return NextResponse.json({ message: "Invalid video ID" }, { status: 400 });
    }

    const existing = await storage.getClassroomVideo(videoId);
    if (!existing) {
      return NextResponse.json({ message: "Video not found" }, { status: 404 });
    }

    await storage.deleteClassroomVideo(videoId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete classroom video:", error);
    return NextResponse.json(
      { message: "Failed to delete classroom video" },
      { status: 500 }
    );
  }
}
