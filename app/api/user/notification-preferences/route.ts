import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const prefs = await storage.getUserNotificationPreferences(userId);
    return NextResponse.json(prefs);
  } catch (error) {
    console.error("Failed to fetch notification preferences:", error);
    return NextResponse.json(
      { message: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const body = await req.json();
    const prefsSchema = z.record(z.boolean());
    const parsed = prefsSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid preferences format" },
        { status: 400 }
      );
    }

    const updated = await storage.updateUserNotificationPreferences(
      userId,
      parsed.data
    );

    if (!updated) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Preferences updated" });
  } catch (error) {
    console.error("Failed to update notification preferences:", error);
    return NextResponse.json(
      { message: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}
