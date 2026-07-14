import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const tasks = await storage.getTasks();
    const similarTasks = tasks
      .filter((task) => task.platform === platform && task.isActive)
      .slice(0, 5);
    return NextResponse.json(similarTasks, { status: 200 });
  } catch (error) {
    console.error("Failed to get similar tasks:", error);
    return NextResponse.json(
      { message: "Failed to get similar tasks" },
      { status: 500 }
    );
  }
}
