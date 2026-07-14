import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/admin/system/metrics
export async function GET(_req: NextRequest) {
  try {
    const superAuth = await requireSuperadmin();
    if (superAuth instanceof NextResponse) return superAuth;

    const memoryUsage = process.memoryUsage();

    const userCount = (await storage.getAllUsers()).length;
    const taskCount = (await storage.getTasks()).length;
    const completedTaskCount = (await storage.getAllUserTasks()).length;

    return NextResponse.json(
      {
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        },
        application: {
          users: userCount,
          tasks: taskCount,
          completedTasks: completedTaskCount,
          taskCompletionRate:
            taskCount > 0 ? (completedTaskCount / taskCount).toFixed(2) : 0,
        },
        server: {
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("System metrics error:", error);
    return NextResponse.json(
      { message: "Failed to get system metrics" },
      { status: 500 }
    );
  }
}
