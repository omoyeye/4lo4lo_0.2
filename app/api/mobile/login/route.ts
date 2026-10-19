import { NextRequest, NextResponse } from "next/server";
import { comparePasswords } from "@/auth";
import { storage } from "@/lib/core/storage";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { issueMobileToken } from "@/lib/mobile-token";
import { toPublicUser } from "@/lib/public-user";

/**
 * POST /api/mobile/login  { username, password }
 *
 * Same credential check as the NextAuth Credentials provider, but returns a
 * bearer token for the native app instead of setting a cookie.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, LIMITS.auth);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ message: "Username and password are required" }, { status: 400 });
  }

  try {
    const user = await storage.getUserByUsername(username);
    if (!user || !(await comparePasswords(password, user.password))) {
      return NextResponse.json({ message: "Invalid username or password" }, { status: 401 });
    }

    await storage.updateLoginStreak(user.id).catch(() => {});
    const fresh = (await storage.getUser(user.id).catch(() => undefined)) ?? user;

    const token = await issueMobileToken({
      id: fresh.id,
      username: fresh.username,
      email: fresh.email,
      displayName: fresh.displayName ?? null,
      avatar: fresh.avatar ?? null,
      role: fresh.role ?? "user",
    });

    return NextResponse.json({ token, user: toPublicUser(fresh) }, { status: 200 });
  } catch (error) {
    console.error("Mobile login error:", error);
    return NextResponse.json({ message: "Login failed" }, { status: 500 });
  }
}
