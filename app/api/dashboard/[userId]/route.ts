import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";
import { dashboardCache, cacheKeys } from "@/lib/core/cache";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId: paramId } = await params;
    const userId = parseInt(paramId, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const requestingUserId = parseInt(session.user.id, 10);
    const isAdmin = session.user.role === "admin" || session.user.isAdmin;

    if (requestingUserId !== userId && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Check cache first
    const cacheKey = cacheKeys.dashboard(userId);
    const cached = dashboardCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
          ETag: `W/"dashboard-${userId}-${Math.floor(Date.now() / 60000)}"`,
        },
      });
    }

    const user = await storage.getUser(userId);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const [
      availableTasks,
      completed,
      taskCounts,
      pointsData,
      milestones,
      recentTasks,
      topEarners,
    ] = await Promise.all([
      storage.getAvailableTasks(userId),
      storage.getCompletedTasks(userId),
      storage.getTaskCounts(userId),
      storage.getUserPoints(userId),
      storage.getUserMilestones(userId),
      storage.getRecentTasks(userId, 5),
      storage.getTopEarners(5),
    ]);

    // Strip passwords from top earners
    const safeTopEarners = topEarners.map(({ password, ...u }) => u);

    const dashboardResult = {
      user: {
        id: user.id,
        username: user.username,
        points: user.points,
        level: user.level,
        progress: user.progress,
        globalRank: user.globalRank,
      },
      taskCounts: {
        available: availableTasks.length || 0,
        completed: completed.length || 0,
      },
      pointsData,
      milestones,
      recentTasks,
      topEarners: safeTopEarners,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result for 30 seconds
    dashboardCache.set(cacheKey, dashboardResult);

    return NextResponse.json(dashboardResult, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        ETag: `W/"dashboard-${userId}-${Math.floor(Date.now() / 60000)}"`,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { message: "Failed to get dashboard data" },
      { status: 500 }
    );
  }
}
