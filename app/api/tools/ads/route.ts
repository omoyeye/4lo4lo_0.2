import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";

// GET /api/tools/ads (Public)
export async function GET(_req: NextRequest) {
  try {
    const ads = await storage.getActiveAdPlacements();
    return NextResponse.json(ads);
  } catch (error) {
    console.error("Failed to fetch ads:", error);
    return NextResponse.json(
      { message: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}
