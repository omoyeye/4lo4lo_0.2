import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { storage } from "@/lib/core/storage";
import { sendPasswordResetEmail } from "@/lib/core/services/email";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/seo";

const TOKEN_TTL_MS = 60 * 60 * 1000;

const GENERIC_RESPONSE = {
  message: "If an account exists with this email, a password reset link has been sent.",
};

/**
 * POST /api/auth/forgot-password  { email }
 *
 * Always answers the same way whether or not the address is registered, so the
 * endpoint cannot be used to discover which emails have accounts.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, LIMITS.contact);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Please enter a valid email address" }, { status: 400 });
  }

  try {
    const user = await storage.getUserByEmail(email);
    if (user) {
      const token = randomBytes(32).toString("hex");
      await storage.createPasswordResetToken(user.id, token, new Date(Date.now() + TOKEN_TTL_MS));
      await sendPasswordResetEmail({
        username: user.username,
        email: user.email,
        resetLink: `${siteUrl()}/reset-password?token=${token}`,
      });
    }
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Could not send reset email. Please try again." }, { status: 500 });
  }
}
