import { NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";

export async function GET() {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    let dbStatus = "healthy";
    try {
      await storage.getUser(1);
    } catch {
      dbStatus = "error";
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      database: dbStatus,
      environment: process.env.NODE_ENV ?? "development",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
