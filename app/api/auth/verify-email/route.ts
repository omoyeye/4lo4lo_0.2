import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { storage } from "@/lib/core/storage";
import { isMissingTable } from "@/lib/core/sql-utils";
import { confirmToken, getVerificationStatus, sendVerificationEmail, VerificationError } from "@/lib/core/email-verification";

export const runtime = "nodejs";

/** GET /api/auth/verify-email, the signed-in member's verification status. */
export async function GET() {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;
  const user = await storage.getUser(userId);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getVerificationStatus(user));
}

/**
 * POST /api/auth/verify-email
 *   { token }   confirm a link (no sign-in needed, the token is the proof)
 *   {}          send / resend the link to the signed-in member
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, LIMITS.auth);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));

  try {
    if (typeof body?.token === "string") {
      const userId = await confirmToken(body.token);
      if (!userId) {
        return NextResponse.json({ message: "This link is invalid or has already been used." }, { status: 400 });
      }
      return NextResponse.json({ verified: true });
    }

    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;
    const user = await storage.getUser(userId);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await sendVerificationEmail(user);
    return NextResponse.json({ sent: true, email: user.email });
  } catch (err) {
    if (err instanceof VerificationError) return NextResponse.json({ message: err.message }, { status: err.status });
    if (isMissingTable(err)) return NextResponse.json({ message: "Email verification is not enabled yet." }, { status: 503 });
    console.error("verify-email failed", err);
    return NextResponse.json({ message: "Could not send the email. Please try again later." }, { status: 500 });
  }
}
