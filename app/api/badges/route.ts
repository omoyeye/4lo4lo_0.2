import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/badges — returns all available badges (requires auth)
export async function GET(_req: NextRequest) {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  try {
    const badges = await storage.getAllBadges();
    return NextResponse.json(badges);
  } catch (error) {
    console.error("Failed to fetch badges:", error);
    return NextResponse.json(
      { message: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}
