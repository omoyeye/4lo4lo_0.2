import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/admin/system/db-status
export async function GET(_req: NextRequest) {
  try {
    const superAuth = await requireSuperadmin();
    if (superAuth instanceof NextResponse) return superAuth;

    // Check database connection by performing a simple query
    await storage.getUser(1); // Just try to get a user to test connection

    return NextResponse.json(
      {
        connected: true,
        status: "healthy",
        lastChecked: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Database status check error:", error);
    return NextResponse.json(
      {
        connected: false,
        status: "error",
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 } // Still returns 200 because the status format handles the error
    );
  }
}
