import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/core/storage";
import { appSettings } from "@shared/schema.mysql";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const allSettings = await db.select().from(appSettings);
    const settingsMap: Record<string, string> = {};
    for (const s of allSettings) settingsMap[s.key] = s.value ?? "";

    if (settingsMap.leaderboard_enabled === "false") {
      return NextResponse.json(
        { message: "Leaderboard is currently disabled" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let period = searchParams.get("period") ?? "alltime";
    if (period === "all") period = "alltime";
    if (!["alltime", "weekly", "monthly"].includes(period)) {
      return NextResponse.json(
        { message: "Invalid period. Use: alltime, weekly, monthly" },
        { status: 400 }
      );
    }

    const country = searchParams.get("country") ?? undefined;
    const limit = Math.max(
      1,
      Math.min(parseInt(settingsMap.leaderboard_limit ?? "50", 10) || 50, 500)
    );
    const requestingUserId = session?.user?.id
      ? parseInt(session.user.id, 10)
      : undefined;

    const result = await storage.getLeaderboard({
      period: period as "alltime" | "weekly" | "monthly",
      country,
      limit,
      requestingUserId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { message: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
