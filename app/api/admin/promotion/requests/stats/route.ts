import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { promotionRequests } from "@shared/schema.mysql";

// GET /api/admin/promotion/requests/stats
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const allRequests = await db.select().from(promotionRequests);

    const stats = {
      total: allRequests.length,
      pending: allRequests.filter((r) => r.status === "pending").length,
      approved: allRequests.filter((r) => r.status === "approved").length,
      rejected: allRequests.filter((r) => r.status === "rejected").length,
      revenue: allRequests.reduce((sum, r) => {
        return sum + (parseFloat(r.price?.toString() || "0") || 0);
      }, 0),
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch promotion stats:", error);
    return NextResponse.json(
      { message: "Failed to fetch promotion stats" },
      { status: 500 }
    );
  }
}
