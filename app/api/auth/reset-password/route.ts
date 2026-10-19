import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/auth";
import { storage } from "@/lib/core/storage";
import { sendPasswordResetConfirmationEmail } from "@/lib/core/services/email";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/seo";

const INVALID = { message: "This reset link is invalid or has expired. Please request a new one." };

/**
 * POST /api/auth/reset-password  { token, newPassword }
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, LIMITS.auth);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!token) return NextResponse.json(INVALID, { status: 400 });
  if (newPassword.length < 6) {
    return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
  }

  try {
    const record = await storage.getPasswordResetToken(token);
    if (!record || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(INVALID, { status: 400 });
    }

    // Burn the token before changing the password so a replay cannot race it.
    await storage.markTokenAsUsed(token);
    const updated = await storage.updateUserPassword(record.userId, await hashPassword(newPassword));

    if (updated) {
      sendPasswordResetConfirmationEmail({
        username: updated.username,
        email: updated.email,
        loginLink: `${siteUrl()}/auth`,
      }).catch((err) => console.error("Reset confirmation email failed:", err));
    }

    return NextResponse.json({ message: "Your password has been reset. You can now log in." }, { status: 200 });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Could not reset password. Please try again." }, { status: 500 });
  }
}
