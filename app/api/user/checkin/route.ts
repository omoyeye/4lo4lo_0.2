import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// POST /api/user/checkin
export async function POST(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const updatedUser = await storage.updateLoginStreak(userId);
    const newBadgeKeys = await storage.checkAndAwardBadges(userId);
    return NextResponse.json({ user: updatedUser, newBadgeKeys });
  } catch (error) {
    console.error("Failed to process check-in:", error);
    return NextResponse.json(
      { message: "Failed to process check-in" },
      { status: 500 }
    );
  }
}
