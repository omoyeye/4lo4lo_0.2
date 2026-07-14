import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertBadgeSchema } from "@shared/schema.mysql";

// PATCH /api/admin/badges/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const badgeId = parseInt(id, 10);
    if (isNaN(badgeId)) {
      return NextResponse.json(
        { message: "Invalid badge ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = insertBadgeSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const badge = await storage.updateBadge(badgeId, parsed.data);
    if (!badge) {
      return NextResponse.json(
        { message: "Badge not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(badge, { status: 200 });
  } catch (error) {
    console.error("Failed to update badge:", error);
    return NextResponse.json(
      { message: "Failed to update badge" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/badges/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const badgeId = parseInt(id, 10);
    if (isNaN(badgeId)) {
      return NextResponse.json(
        { message: "Invalid badge ID" },
        { status: 400 }
      );
    }

    const deleted = await storage.deleteBadge(badgeId);
    if (!deleted) {
      return NextResponse.json(
        { message: "Badge not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete badge:", error);
    return NextResponse.json(
      { message: "Failed to delete badge" },
      { status: 500 }
    );
  }
}
