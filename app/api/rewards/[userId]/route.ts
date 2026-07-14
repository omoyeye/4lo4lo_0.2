import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";

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

    const [tasks, user] = await Promise.all([
      storage.getCompletedTasks(userId),
      storage.getUser(userId),
    ]);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Get all available tasks
    const allTasks = await storage.getTasks();
    const activeTasks = allTasks.filter((task) => task.isActive);

    // Calculate 3 months from user registration
    const userRegistrationDate = new Date(user.createdAt!);
    const threeMonthsLater = new Date(userRegistrationDate);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const isWithinFirstThreeMonths = new Date() <= threeMonthsLater;

    // For Social Starter: check if user completed all tasks within first 3 months
    const socialStarterUnlocked =
      isWithinFirstThreeMonths &&
      tasks.length >= activeTasks.length &&
      activeTasks.length > 0;
    const socialStarterProgress =
      activeTasks.length > 0
        ? Math.min((tasks.length / activeTasks.length) * 100, 100)
        : 0;

    // Calculate rewards based on user's progress
    const rewards = [
      {
        id: "1",
        title: "Social Starter",
        description: "Complete all tasks within your first 3 months",
        points: 100,
        icon: "globe",
        unlocked: socialStarterUnlocked,
        progress: socialStarterProgress,
      },
      {
        id: "2",
        title: "Engagement Pro",
        description: "Complete 500 tasks to unlock",
        points: 500,
        icon: "zap",
        unlocked: tasks.length >= 500,
        progress: Math.min((tasks.length / 500) * 100, 100),
      },
    ];

    return NextResponse.json(rewards, { status: 200 });
  } catch (error) {
    console.error("Failed to get rewards:", error);
    return NextResponse.json(
      { message: "Failed to get rewards" },
      { status: 500 }
    );
  }
}
