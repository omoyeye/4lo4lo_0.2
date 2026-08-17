import { NextRequest, NextResponse } from "next/server";
import { Auth, raw, skipCSRFCheck } from "@auth/core";
import { comparePasswords, isAdminRole, authConfig } from "@/auth";
import { storage } from "@/lib/core/storage";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

/**
 * POST /api/admin/login
 *
 * Validates admin credentials and role, then mints a session cookie.
 *
 * WHY THIS CALLS Auth() DIRECTLY INSTEAD OF signIn()
 *
 * Auth.js v5's `signIn()` sets cookies via next/headers `cookies().set()`,
 * which works in Server Actions but silently drops cookies in Route Handlers
 * when the handler returns its own NextResponse. The result: login appeared to
 * succeed (200) but no session cookie was set, so the proxy bounced the user
 * back to /admin/login on the next request.
 *
 * Calling Auth() directly returns the raw response including cookie descriptors
 * which we copy onto our own NextResponse. This guarantees the browser receives
 * the Set-Cookie header regardless of the Next.js execution context.
 */

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, LIMITS.auth);
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Username and password are required" },
        { status: 400 }
      );
    }
    const { username, password } = parsed.data;

    const user = await storage.getUserByUsername(username);

    const passwordValid = user
      ? await comparePasswords(password, user.password)
      : false;

    if (!user || !passwordValid) {
      const legacyAdmin = await storage
        .getAdminByUsername(username)
        .catch(() => undefined);

      if (legacyAdmin && (await comparePasswords(password, legacyAdmin.password))) {
        return NextResponse.json(
          {
            message:
              "This account exists only in the legacy `admins` table and has no linked user account. " +
              "Run scripts/sql/002-link-legacy-admins.sql to see how to link it, then sign in again.",
            code: "LEGACY_ADMIN_UNLINKED",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { message: "This account does not have admin access" },
        { status: 403 }
      );
    }

    // Mint the session by calling Auth() directly so we can capture the
    // Set-Cookie headers and forward them on our own response.
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("host") ?? "localhost";
    const origin = `${proto}://${host}`;
    const callbackUrl = `${origin}/admin`;

    const authReq = new Request(
      `${origin}/api/auth/callback/credentials`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password, callbackUrl }),
      }
    );

    const authRes = await Auth(authReq, {
      ...authConfig,
      raw,
      skipCSRFCheck,
    });

    const response = NextResponse.json(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        redirectTo: "/admin",
      },
      { status: 200 }
    );

    // Forward the session cookies from Auth's response onto ours.
    for (const c of authRes?.cookies ?? []) {
      response.cookies.set(c.name, c.value, c.options ?? {});
    }

    // Best-effort: record the login against the legacy admins row if one exists.
    storage
      .getAdminByUsername(username)
      .then((a) => (a ? storage.updateAdminLastLogin(a.id) : null))
      .catch(() => {});

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ message: "Admin login failed" }, { status: 500 });
  }
}
