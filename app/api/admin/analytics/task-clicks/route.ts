import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/admin/analytics/task-clicks
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const analytics = await storage.getTaskClickAnalytics();
    return NextResponse.json(analytics, { status: 200 });
  } catch (error) {
    console.error("Failed to get task click analytics:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to get task click analytics",
      },
      { status: 500 }
    );
  }
}
