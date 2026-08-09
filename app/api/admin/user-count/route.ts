import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/user-count
 *
 * Audience size for the Email Center, so an admin can see who a bulk send
 * will actually reach before pressing the button.
 */
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const users = await storage.getAllUsers();

    const withEmail = users.filter(
      (u) => typeof u.email === "string" && u.email.includes("@")
    );

    return NextResponse.json(
      {
        total: users.length,
        verified: withEmail.length,
        unverified: users.length - withEmail.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to count users:", error);
    return NextResponse.json(
      { message: "Failed to count users" },
      { status: 500 }
    );
  }
}
