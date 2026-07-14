import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// POST /api/notifications/mark-all-read
export async function POST(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    await storage.markAllNotificationsAsRead(userId);
    return NextResponse.json(
      { message: "All notifications marked as read" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { message: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
