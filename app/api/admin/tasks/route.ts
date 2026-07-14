import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { createTaskSchema } from "@shared/schema.mysql";
import { z } from "zod";
import { notificationService } from "@/lib/core/notification-service";

// GET /api/admin/tasks
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const tasks = await storage.getTasks();
    return NextResponse.json(tasks, { status: 200 });
  } catch (error) {
    console.error("Failed to get tasks:", error);
    return NextResponse.json(
      { message: "Failed to get tasks" },
      { status: 500 }
    );
  }
}

// POST /api/admin/tasks
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;
    const adminId = adminAuth.id;

    const body = await req.json();
    const validatedData = createTaskSchema.parse(body);

    const scheduledAt = validatedData.scheduledPublishAt
      ? new Date(validatedData.scheduledPublishAt)
      : null;

    const newTask = await storage.addTask({
      ...validatedData,
      difficulty: "easy",
      isActive: scheduledAt ? false : true,
      maxCompletions: validatedData.maxCompletions ?? null,
      createdAt: new Date(),
      createdBy: adminId,
      expiresAt: validatedData.expiresAt
        ? new Date(validatedData.expiresAt)
        : null,
      scheduledPublishAt: scheduledAt,
      category: null,
    });

    if (newTask.isActive) {
      // TODO: (Phase 9) Send real-time SSE update here.
      // const realTimeService = getRealTimeService();
      // if (realTimeService) {
      //   realTimeService.broadcastNewTask(newTask);
      // }
      notificationService
        .notifyNewTask(newTask.title, newTask.id)
        .catch((err: any) => {
          console.error("Failed to send new task notifications:", err);
        });
    }

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Task creation error:", error);
    return NextResponse.json(
      { message: "Failed to create task" },
      { status: 500 }
    );
  }
}
