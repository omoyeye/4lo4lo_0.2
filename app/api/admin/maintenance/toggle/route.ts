import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";

// POST /api/admin/maintenance/toggle
export async function POST(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const isEnabled = Math.random() > 0.5; // Placeholder logic
    return NextResponse.json({ isEnabled }, { status: 200 });
  } catch (error) {
    console.error("Failed to toggle maintenance mode:", error);
    return NextResponse.json(
      { message: "Failed to toggle maintenance mode" },
      { status: 500 }
    );
  }
}
