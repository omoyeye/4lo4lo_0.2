import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/user/referral-tier
export async function GET(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const result = await storage.getUserReferralTier(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch referral tier:", error);
    return NextResponse.json(
      { message: "Failed to fetch referral tier" },
      { status: 500 }
    );
  }
}
