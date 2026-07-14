import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/user/badges
export async function GET(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const earned = await storage.getUserBadges(userId);
    return NextResponse.json(earned);
  } catch (error) {
    console.error("Failed to fetch user badges:", error);
    return NextResponse.json(
      { message: "Failed to fetch user badges" },
      { status: 500 }
    );
  }
}
