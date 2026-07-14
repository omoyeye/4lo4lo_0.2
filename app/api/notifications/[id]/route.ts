import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// DELETE /api/notifications/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const { id } = await params;
    const notificationId = parseInt(id, 10);

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { message: "Invalid notification ID" },
        { status: 400 }
      );
    }

    const deleted = await storage.deleteNotification(notificationId);
    if (!deleted) {
      return NextResponse.json(
        { message: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Notification deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { message: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
