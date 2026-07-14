import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/level-history
export async function GET(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const history = await storage.getUserLevelHistory(userId);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Failed to fetch level history:", error);
    return NextResponse.json(
      { message: "Failed to fetch level history" },
      { status: 500 }
    );
  }
}
