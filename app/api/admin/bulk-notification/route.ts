import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// POST /api/admin/bulk-notification
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { title, message, type = "system_announcement" } = await req.json();

    if (!title || !message) {
      return NextResponse.json(
        { message: "Title and message are required" },
        { status: 400 }
      );
    }

    const allUsers = await storage.getAllUsers();
    let successCount = 0;

    for (const user of allUsers) {
      try {
        await storage.createNotification({
          userId: user.id,
          adminOnly: false,
          type,
          title,
          message,
          data: null,
          isRead: false,
        });
        successCount++;
      } catch (err) {
        console.error(
          `Failed to create notification for user ${user.id}:`,
          err
        );
      }
    }

    // TODO: (Phase 9) Send real-time SSE update here.
    // try {
    //   const websocketModule = await import('./websocket');
    //   const rtService = websocketModule.getRealTimeService();
    //   if (rtService) {
    //     rtService.broadcastToAllUsers({
    //       type: "new_notification",
    //       data: { type, title, message },
    //       timestamp: Date.now()
    //     });
    //   }
    // } catch (err) {
    //   console.error("Failed to broadcast notification:", err);
    // }

    return NextResponse.json(
      {
        message: `In-app notification sent to ${successCount} users`,
        success: successCount,
        total: allUsers.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Bulk notification error:", error);
    return NextResponse.json(
      { message: "Failed to send bulk notifications" },
      { status: 500 }
    );
  }
}
