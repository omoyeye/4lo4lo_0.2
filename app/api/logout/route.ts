import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/auth";

/**
 * POST /api/logout
 * Signs out the current user and clears their session cookie.
 */
export async function POST(_req: NextRequest) {
  try {
    await signOut({ redirect: false });
    return NextResponse.json({ redirectTo: "/auth" }, { status: 200 });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ message: "Logout failed" }, { status: 500 });
  }
}
