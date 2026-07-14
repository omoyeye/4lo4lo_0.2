import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get("userId");

    if (!userIdStr) {
      return NextResponse.json({ message: "User ID required" }, { status: 400 });
    }

    const userId = parseInt(userIdStr, 10);
    const requestingUserId = parseInt(session.user.id, 10);
    const isAdmin = session.user.role === "admin" || session.user.isAdmin;

    if (requestingUserId !== userId && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Get all active tasks and user's completed task IDs in parallel
    const [tasks, completedTaskIds] = await Promise.all([
      storage.getTasks(),
      storage.getCompletedTaskIds(userId),
    ]);

    // Use Set for O(1) lookup of completed tasks
    const completedSet = new Set(completedTaskIds);

    // Filter available tasks efficiently
    const availableTasks = tasks.filter(
      (task) => task.isActive && !completedSet.has(task.id)
    );

    return NextResponse.json(availableTasks, { status: 200 });
  } catch (error) {
    console.error("Failed to get tasks:", error);
    return NextResponse.json(
      { message: "Failed to get tasks" },
      { status: 500 }
    );
  }
}
