import { NextRequest, NextResponse, after } from "next/server";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";
import { nanoid } from "nanoid";
import { storage } from "@/lib/core/storage";
import { toPublicUser } from "@/lib/public-user";
import { signIn } from "@/auth";
import { sendWelcomeEmail } from "@/lib/core/services/email";
import { sendVerificationEmail } from "@/lib/core/email-verification";
import { isMissingTable } from "@/lib/core/sql-utils";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/seo";
import { usernameProblem } from "@/lib/username";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * POST /api/register
 * Registers a new user and returns their profile.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, LIMITS.register);
  if (limited) return limited;

  try {
    const body = await req.json();

    // Adults only (Terms §2). Both boxes are ticked explicitly in the web and
    // app sign-up forms; refusing here means an API caller can't skip them.
    if (body.ageConfirmed !== true || body.termsAccepted !== true) {
      return NextResponse.json(
        { message: "You must be 18 or older and accept the Terms of Service and Privacy Policy to register" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (typeof body.username !== "string" || typeof body.password !== "string" || typeof body.email !== "string" || !body.username || !body.password || !body.email) {
      return NextResponse.json(
        { message: "Username, email and password are required" },
        { status: 400 }
      );
    }
    // The forms check these too, but the API is reachable without them.
    body.username = body.username.trim();
    body.email = body.email.trim();
    const nameProblem = usernameProblem(body.username);
    if (nameProblem) return NextResponse.json({ message: nameProblem }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 255) {
      return NextResponse.json({ message: "Please enter a valid email address" }, { status: 400 });
    }
    if (body.password.length < 6 || body.password.length > 200) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check for existing username / email
    const existingUsername = await storage.getUserByUsername(body.username);
    if (existingUsername) {
      return NextResponse.json(
        { message: "Username already exists" },
        { status: 400 }
      );
    }

    const existingEmail = await storage.getUserByEmail(body.email);
    if (existingEmail) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 400 }
      );
    }

    const referralCode = nanoid(8);
    const hashedPassword = await hashPassword(body.password);

    const user = await storage.createUser({
      username: body.username,
      email: body.email,
      password: hashedPassword,
      referralCode,
      displayName: body.displayName ?? null,
      country: body.country ?? "Unknown",
      region: body.region ?? "Unknown",
      platform: "local",
      facebook_handle: body.facebook_handle ?? null,
      instagram_handle: body.instagram_handle ?? null,
      tiktok_handle: body.tiktok_handle ?? null,
      youtube_handle: body.youtube_handle ?? null,
    });

    // Process referral if referrerCode was provided
    if (body.referrerCode) {
      const referrer = await storage.getUserByReferralCode(body.referrerCode);
      if (referrer) {
        await storage.addReferral(referrer.id, user.id);
        storage.checkAndAwardBadges(referrer.id).catch(() => {});
      }
    }

    // Send welcome email asynchronously
    const referralLink = `${siteUrl()}/auth?ref=${user.referralCode}`;
    // after(): on Vercel an un-awaited promise can be cut off when the
    // response is sent, which is how welcome emails went missing.
    after(async () => {
      await sendWelcomeEmail({
        username: user.username,
        email: user.email,
        referralCode: user.referralCode,
        referralLink,
      }).catch((error) => console.error("Failed to send welcome email:", error));
      await sendVerificationEmail(user).catch((error) => {
        if (!isMissingTable(error)) console.error("Failed to send verification email:", error);
      });
    });

    return NextResponse.json(toPublicUser(user), { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Registration failed" },
      { status: 500 }
    );
  }
}
