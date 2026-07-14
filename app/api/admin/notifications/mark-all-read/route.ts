import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// POST /api/admin/notifications/mark-all-read
export async function POST(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    await storage.markAllAdminNotificationsAsRead();
    return NextResponse.json(
      { message: "All admin notifications marked as read" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error marking admin notifications as read:", error);
    return NextResponse.json(
      { message: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
