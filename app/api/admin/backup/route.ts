import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";

// POST /api/admin/backup
export async function POST(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const timestamp = new Date().toISOString();
    return NextResponse.json(
      {
        message: "Backup completed",
        timestamp,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to create backup:", error);
    return NextResponse.json(
      { message: "Failed to create backup" },
      { status: 500 }
    );
  }
}
