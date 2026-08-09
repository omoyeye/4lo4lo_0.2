import { NextRequest, NextResponse } from "next/server";
import { signIn, comparePasswords, isAdminRole } from "@/auth";
import { storage } from "@/lib/core/storage";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

/**
 * POST /api/admin/login
 *
 * NOTE ON THE PATH: this used to live at /api/auth/admin/login, which is
 * swallowed by the NextAuth catch-all at app/api/auth/[...nextauth]/route.ts —
 * admin login could never succeed. It lives under /api/admin/* now so it owns
 * its own path.
 *
 * Authorization derives from `users.role`, because that is what every one of
 * the admin API routes enforces via requireAdmin()/requireSuperadmin(). The
 * legacy `admins` table is treated as a directory, not as an auth source; see
 * the 409 branch below.
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

    // Verify the password before we mint any session, so we can reject
    // non-admins with a 403 instead of leaving them holding a valid cookie.
    const passwordValid = user
      ? await comparePasswords(password, user.password)
      : false;

    if (!user || !passwordValid) {
      // Distinguish the "admin exists only in the legacy admins table" case,
      // which is otherwise indistinguishable from a wrong password and would
      // leave a real operator permanently locked out with no explanation.
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

    // Credentials and role are good — hand off to NextAuth to set the cookie.
    await signIn("credentials", { username, password, redirect: false });

    // Best-effort: record the login against the legacy admins row if one exists.
    storage
      .getAdminByUsername(username)
      .then((a) => (a ? storage.updateAdminLastLogin(a.id) : null))
      .catch(() => {});

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        redirectTo: "/admin",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ message: "Admin login failed" }, { status: 500 });
  }
}
