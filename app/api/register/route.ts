import { NextRequest, NextResponse } from "next/server";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";
import { nanoid } from "nanoid";
import { storage } from "@/lib/core/storage";
import { signIn } from "@/auth";
import { sendWelcomeEmail } from "@/lib/core/services/email";

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
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.username || !body.password || !body.email) {
      return NextResponse.json(
        { message: "Username, email and password are required" },
        { status: 400 }
      );
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
    const referralLink = `https://4lo4lo.site/auth?ref=${user.referralCode}`;
    sendWelcomeEmail({
      username: user.username,
      email: user.email,
      referralCode: user.referralCode,
      referralLink,
    }).catch((error) => {
      console.error("Failed to send welcome email:", error);
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Registration failed" },
      { status: 500 }
    );
  }
}
