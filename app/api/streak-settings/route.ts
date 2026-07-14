import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";

// GET /api/streak-settings — public, no auth required
export async function GET(_req: NextRequest) {
  try {
    const settings = await storage.getStreakSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch streak settings:", error);
    return NextResponse.json(
      { message: "Failed to fetch streak settings" },
      { status: 500 }
    );
  }
}
