import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";

// GET /api/admin/analytics/dashboard
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    return NextResponse.json(
      {
        activeUsersToday: 0,
        activeBatches: 0,
        pendingAllocations: 0,
        completionRate: "0.00",
        lastUpdated: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error getting dashboard metrics:", error);
    return NextResponse.json(
      { message: "Failed to get dashboard metrics" },
      { status: 500 }
    );
  }
}
