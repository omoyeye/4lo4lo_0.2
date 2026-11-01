import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";
import { toPublicUser } from "@/lib/public-user";

/**
 * GET /api/user
 * Returns the currently authenticated user's full profile.
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  const user = await storage.getUser(userId).catch(() => null);

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  // A session that outlived its account deletion is signed out client-side.
  if (user.role === "deleted") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(toPublicUser(user));
}
