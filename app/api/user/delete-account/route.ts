import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { comparePasswords, isAdminRole } from "@/auth";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { storage } from "@/lib/core/storage";
import { anonymizeUser } from "@/lib/core/account-deletion";

/**
 * POST /api/user/delete-account  { password?, confirm: "DELETE" }
 *
 * Self-service account deletion (required by the App Store and Play Store).
 * Accounts created with Google never saw their password, so they confirm by
 * typing DELETE instead.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, LIMITS.auth);
  if (limited) return limited;

  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ message: 'Type DELETE to confirm' }, { status: 400 });
  }

  const user = await storage.getUser(userId);
  if (!user || user.role === "deleted") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (isAdminRole(user.role)) {
    return NextResponse.json({ message: "Admin accounts can't be deleted here. Ask a superadmin to remove your access first." }, { status: 403 });
  }

  if (!user.googleId) {
    const password = typeof body?.password === "string" ? body.password : "";
    if (!password || !(await comparePasswords(password, user.password))) {
      return NextResponse.json({ message: "That password is not correct" }, { status: 403 });
    }
  }

  try {
    await anonymizeUser(userId);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("self delete failed", err);
    return NextResponse.json({ message: "Could not delete your account. Please contact support." }, { status: 500 });
  }
}
