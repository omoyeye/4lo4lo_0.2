import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { db } from "@/lib/db";
import { promotionRequests } from "@shared/schema.mysql";

// GET /api/admin/stats
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const [allUsers, allTasks, userTasks, allPromotionRequests] =
      await Promise.all([
        storage.getAllUsers(),
        storage.getTasks(),
        storage.getAllUserTasks(),
        db.select().from(promotionRequests),
      ]);

    const activeTasks = allTasks.filter((task) => task.isActive).length;
    const totalCompletions = Array.from(userTasks).length;
    const userGrowth = allUsers.reduce(
      (acc, user) => {
        const date = new Date(user.createdAt!).toISOString().split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const taskCompletionRate = allTasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      completions: Array.from(userTasks).filter((ut) => ut.taskId === task.id)
        .length,
    }));

    const regionalDistribution = allUsers.reduce(
      (acc, user) => {
        const region = (user as any).region || "Unknown";
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalPromotionRequests = allPromotionRequests.length;
    const totalPromotionRevenue = allPromotionRequests.reduce(
      (sum: number, request: any) => {
        return sum + (parseFloat(request.price?.toString() || "0") || 0);
      },
      0
    );

    return NextResponse.json({
      totalUsers: allUsers.length,
      activeTasks,
      totalTasks: allTasks.length,
      totalCompletions,
      totalPromotionRequests,
      totalPromotionRevenue: totalPromotionRevenue.toFixed(2),
      systemHealth: "Healthy",
      analytics: {
        userGrowth,
        taskCompletionRate,
        topPlatforms: allTasks.reduce(
          (acc, task) => {
            acc[task.platform] = (acc[task.platform] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        regionalDistribution,
      },
    });
  } catch (error) {
    console.error("Failed to get admin stats:", error);
    return NextResponse.json(
      { message: "Failed to get admin stats" },
      { status: 500 }
    );
  }
}
