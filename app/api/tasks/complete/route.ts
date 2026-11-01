import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";
import { taskCompleteSchema, taskClicks } from "@shared/schema.mysql";
import { z } from "zod";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { getRealTimeService } from "@/lib/sse";
import { proofRequired } from "@/lib/core/proofs";
import { TaskClosedError } from "@/lib/core/task-availability";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    // Rate limit per account, not per IP, this is the points-earning path and
    // the thing worth throttling is one account spamming completions.
    const limited = rateLimit(req, LIMITS.taskAction, `user:${userId}`);
    if (limited) return limited;

    const body = await req.json();
    const validatedData = taskCompleteSchema.parse(body);
    const { taskId, clickId } = validatedData;

    // With proofs switched on, completion goes through /api/tasks/proof so an
    // admin can check the screenshot before any points are paid.
    if (await proofRequired()) {
      return NextResponse.json(
        { message: "Upload a screenshot to finish this task", proofRequired: true },
        { status: 409 }
      );
    }

    // Cheap pre-check so the common "already done" case doesn't hit the
    // transaction. It is NOT the safety net, completeTask() re-checks under
    // a row lock, because this check alone is a read-then-write race.
    const completedIds = await storage.getCompletedTaskIds(userId);
    if (completedIds.includes(taskId)) {
      return NextResponse.json(
        { message: "Task already completed", alreadyCompleted: true },
        { status: 200 }
      );
    }

    // If a clickId is supplied it must belong to this user and this task,
    // otherwise a caller could mark someone else's click as converted.
    if (clickId) {
      const [click] = await db
        .select()
        .from(taskClicks)
        .where(and(eq(taskClicks.id, clickId), eq(taskClicks.userId, userId)));

      if (!click || click.taskId !== taskId) {
        return NextResponse.json(
          { message: "Invalid click reference for this task" },
          { status: 400 }
        );
      }
    }

    let userTask;
    try {
      userTask = await storage.completeTask(userId, taskId);
    } catch (err) {
      if (err instanceof TaskClosedError) {
        return NextResponse.json({ message: err.message }, { status: 410 });
      }
      const msg = err instanceof Error ? err.message : "";
      // Lost the race, or the unique index rejected the duplicate. Either way
      // the user's first completion stands, report success, award nothing.
      if (
        msg.includes("already completed") ||
        msg.includes("Duplicate entry") ||
        msg.includes("ER_DUP_ENTRY")
      ) {
        return NextResponse.json(
          { message: "Task already completed", alreadyCompleted: true },
          { status: 200 }
        );
      }
      throw err;
    }

    if (clickId) {
      await db
        .update(taskClicks)
        .set({ convertedToCompletion: true })
        .where(eq(taskClicks.id, clickId));
    }

    // Push the completion to any live listeners for this user.
    try {
      getRealTimeService().sendToUser(userId, "task_completed", {
        taskId,
        pointsEarned: userTask.pointsEarned,
      });
      getRealTimeService().sendToUser(userId, "points_updated", {
        delta: userTask.pointsEarned,
      });
    } catch (err) {
      console.error("Failed to broadcast task completion:", err);
    }

    storage.checkAndAwardBadges(userId).catch(() => {});

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
