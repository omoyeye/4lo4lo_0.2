import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { updateTaskSchema } from "@shared/schema.mysql";
import { z } from "zod";

// PATCH /api/admin/tasks/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json(
        { message: "Invalid task ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = updateTaskSchema.parse(body);

    const clearingSchedule =
      "scheduledPublishAt" in body && body.scheduledPublishAt === null;
    const settingSchedule =
      "scheduledPublishAt" in body && body.scheduledPublishAt !== null;

    const taskUpdates: any = {
      ...validatedData,
      expiresAt: validatedData.expiresAt
        ? new Date(validatedData.expiresAt)
        : validatedData.expiresAt === null
        ? null
        : undefined,
      scheduledPublishAt: validatedData.scheduledPublishAt
        ? new Date(validatedData.scheduledPublishAt)
        : validatedData.scheduledPublishAt === null
        ? null
        : undefined,
      // When schedule is set, deactivate so scheduler publishes it later
      ...(settingSchedule && !("isActive" in body) ? { isActive: false } : {}),
      // When schedule is explicitly cleared, auto-publish immediately
      ...(clearingSchedule && !("isActive" in body) ? { isActive: true } : {}),
    };

    const updatedTask = await storage.updateTask(taskId, taskUpdates);
    if (!updatedTask) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { message: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tasks/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json(
        { message: "Invalid task ID" },
        { status: 400 }
      );
    }

    const success = await storage.deleteTask(taskId);
    if (!success) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Task deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { message: "Failed to delete task" },
      { status: 500 }
    );
  }
}
