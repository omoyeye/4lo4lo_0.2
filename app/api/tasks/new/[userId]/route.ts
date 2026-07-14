import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId: paramId } = await params;
    const userId = parseInt(paramId, 10);
    const { searchParams } = new URL(req.url);
    const lastCheck = searchParams.get("lastCheck");

    if (isNaN(userId)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const requestingUserId = parseInt(session.user.id, 10);
    const isAdmin = session.user.role === "admin" || session.user.isAdmin;
    if (requestingUserId !== userId && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const tasks = await storage.getAvailableTasks(userId);

    if (lastCheck) {
      const lastCheckDate = new Date(lastCheck);
      const newTasks = tasks.filter(
        (task) => new Date(task.createdAt!) > lastCheckDate
      );

      return NextResponse.json(
        {
          newTasks,
          totalNew: newTasks.length,
          totalAvailable: tasks.length,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        newTasks: tasks,
        totalNew: tasks.length,
        totalAvailable: tasks.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to check for new tasks:", error);
    return NextResponse.json(
      { message: "Failed to check for new tasks" },
      { status: 500 }
    );
  }
}
