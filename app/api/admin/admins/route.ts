import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

export const dynamic = "force-dynamic";

// GET /api/admin/admins — list admin directory entries (never returns hashes)
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const admins = await storage.getAllAdmins();
    const safe = admins.map(({ password, ...rest }) => rest);
    return NextResponse.json(safe, { status: 200 });
  } catch (error) {
    console.error("Failed to list admins:", error);
    return NextResponse.json(
      { message: "Failed to list admins" },
      { status: 500 }
    );
  }
}
