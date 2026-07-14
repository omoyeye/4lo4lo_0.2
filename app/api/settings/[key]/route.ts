import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appSettings } from "@shared/schema.mysql";
import { eq } from "drizzle-orm";

// GET /api/settings/:key — returns a single setting value
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key));

    if (!setting) {
      return NextResponse.json(
        { message: "Setting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error("Failed to get app setting:", error);
    return NextResponse.json(
      { message: "Failed to get app setting" },
      { status: 500 }
    );
  }
}
