import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appSettings } from "@shared/schema.mysql";
import { eq } from "drizzle-orm";

// GET /api/settings — returns all settings as a key/value map
export async function GET(_req: NextRequest) {
  try {
    const settings = await db.select().from(appSettings);
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value ?? "";
    });
    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error("Failed to get app settings:", error);
    return NextResponse.json(
      { message: "Failed to get app settings" },
      { status: 500 }
    );
  }
}
