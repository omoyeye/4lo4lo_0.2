import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/admin/analytics/user-activity
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const userActivity = await storage.getUserActivityAnalytics();
    return NextResponse.json(userActivity, { status: 200 });
  } catch (error) {
    console.error("Failed to get user activity analytics:", error);
    return NextResponse.json(
      { message: "Failed to get user activity analytics" },
      { status: 500 }
    );
  }
}
