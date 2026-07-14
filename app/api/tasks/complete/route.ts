import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";
import { taskCompleteSchema, taskClicks } from "@shared/schema.mysql";
import { z } from "zod";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = taskCompleteSchema.parse(body);
    const { taskId, clickId } = validatedData;
    const userId = parseInt(session.user.id, 10);

    // Check if task is already completed
    const existingCompletion = await storage.getCompletedTasks(userId);
    const isAlreadyCompleted = existingCompletion.some(
      (task) => task.id === taskId
    );

    if (isAlreadyCompleted) {
      return NextResponse.json(
        { message: "Task already completed", alreadyCompleted: true },
        { status: 200 }
      );
    }

    const userTask = await storage.completeTask(userId, taskId);

    // Mark any task clicks as converted
    if (clickId) {
      await db
        .update(taskClicks)
        .set({ convertedToCompletion: true })
        .where(eq(taskClicks.id, clickId));
    }

    // TODO (Phase 9): Dispatch Server-Sent Events (SSE) notification here
    // for real-time task completion broadcast.

    // Check and award any newly unlocked badges (fire-and-forget)
    storage.checkAndAwardBadges(userId).catch(() => { });

    return NextResponse.json(userTask, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Task completion error:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to complete task",
      },
      { status: 500 }
    );
  }
}
