import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/admin/analytics/task-completions
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const taskCompletions = await storage.getTaskCompletionAnalytics();
    return NextResponse.json(taskCompletions, { status: 200 });
  } catch (error) {
    console.error("Failed to get task completion analytics:", error);
    return NextResponse.json(
      { message: "Failed to get task completion analytics" },
      { status: 500 }
    );
  }
}
