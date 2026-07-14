import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/admin/notifications/unread-count
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const count = await storage.getUnreadAdminNotificationCount();
    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin unread count:", error);
    return NextResponse.json(
      { message: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
