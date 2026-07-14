import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/notifications/unread-count
export async function GET(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const count = await storage.getUnreadNotificationCount(userId);
    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { message: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
