import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertProfileLinkSchema } from "@shared/schema.mysql";

// PATCH /api/profile-links/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const { id } = await params;
    const linkId = parseInt(id, 10);
    if (isNaN(linkId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = insertProfileLinkSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const link = await storage.updateProfileLink(linkId, userId, parsed.data);
    if (!link) {
      return NextResponse.json({ message: "Link not found" }, { status: 404 });
    }
    return NextResponse.json(link);
  } catch (error) {
    console.error("Failed to update profile link:", error);
    return NextResponse.json(
      { message: "Failed to update profile link" },
      { status: 500 }
    );
  }
}

// DELETE /api/profile-links/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const { id } = await params;
    const linkId = parseInt(id, 10);
    if (isNaN(linkId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    const deleted = await storage.deleteProfileLink(linkId, userId);
    if (!deleted) {
      return NextResponse.json({ message: "Link not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete profile link:", error);
    return NextResponse.json(
      { message: "Failed to delete profile link" },
      { status: 500 }
    );
  }
}
