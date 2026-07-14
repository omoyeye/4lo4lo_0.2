import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertAdPlacementSchema } from "@shared/schema.mysql";

// GET /api/admin/ads
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const ads = await storage.getAllAdPlacements();
    return NextResponse.json(ads, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch ads:", error);
    return NextResponse.json(
      { message: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}

// POST /api/admin/ads
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const body = await req.json();
    const parsed = insertAdPlacementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const ad = await storage.createAdPlacement(parsed.data);
    return NextResponse.json(ad, { status: 201 });
  } catch (error) {
    console.error("Failed to create ad:", error);
    return NextResponse.json(
      { message: "Failed to create ad" },
      { status: 500 }
    );
  }
}
