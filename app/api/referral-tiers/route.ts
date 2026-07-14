import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";

// GET /api/referral-tiers (Public)
export async function GET(_req: NextRequest) {
  try {
    const tiers = await storage.getReferralTiers();
    return NextResponse.json(tiers);
  } catch (error) {
    console.error("Failed to fetch referral tiers:", error);
    return NextResponse.json(
      { message: "Failed to fetch referral tiers" },
      { status: 500 }
    );
  }
}
