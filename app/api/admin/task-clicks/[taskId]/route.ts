import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/admin/task-clicks/:taskId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { taskId: taskIdParam } = await params;
    const taskId = parseInt(taskIdParam, 10);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { message: "Invalid task ID" },
        { status: 400 }
      );
    }

    const clicks = await storage.getTaskClicks(taskId);
    const clickCount = await storage.getTaskClicksCount(taskId);

    return NextResponse.json(
      {
        clicks,
        total: clickCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to get task clicks:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to get task clicks",
      },
      { status: 500 }
    );
  }
}
