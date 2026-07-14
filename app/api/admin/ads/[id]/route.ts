import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertAdPlacementSchema } from "@shared/schema.mysql";

// PATCH /api/admin/ads/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const adId = parseInt(id, 10);
    if (isNaN(adId)) {
      return NextResponse.json(
        { message: "Invalid ad ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = insertAdPlacementSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const ad = await storage.updateAdPlacement(adId, parsed.data);
    if (!ad) {
      return NextResponse.json(
        { message: "Ad not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(ad, { status: 200 });
  } catch (error) {
    console.error("Failed to update ad:", error);
    return NextResponse.json(
      { message: "Failed to update ad" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/ads/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const adId = parseInt(id, 10);
    if (isNaN(adId)) {
      return NextResponse.json(
        { message: "Invalid ad ID" },
        { status: 400 }
      );
    }

    const deleted = await storage.deleteAdPlacement(adId);
    if (!deleted) {
      return NextResponse.json(
        { message: "Ad not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete ad:", error);
    return NextResponse.json(
      { message: "Failed to delete ad" },
      { status: 500 }
    );
  }
}
