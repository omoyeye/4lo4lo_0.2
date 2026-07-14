import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";
import { taskClickSchema } from "@shared/schema.mysql";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = taskClickSchema.parse(body);
    const { taskId } = validatedData;
    const userId = parseInt(session.user.id, 10);

    const ipAddress = req.headers.get("x-forwarded-for") || null;
    const userAgent = req.headers.get("user-agent") || null;
    // Note: Next.js doesn't use express-session, so sessionID is omitted or derived differently.
    const sessionId = null;

    const taskClick = await storage.recordTaskClick({
      userId,
      taskId,
      ipAddress,
      userAgent,
      sessionId,
      convertedToCompletion: false,
    });

    return NextResponse.json(taskClick, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Task click error:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to record task click",
      },
      { status: 500 }
    );
  }
}
