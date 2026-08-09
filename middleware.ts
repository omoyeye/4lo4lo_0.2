import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Server-side gate for the admin area.
 *
 * Before this existed, /admin/* was protected only by a client-side useEffect
 * in lib/admin-protected-route.tsx — the HTML was publicly fetchable and the
 * guard could be skipped by disabling JS. The API routes were (and remain)
 * guarded independently by requireAdmin(), so this is defence in depth rather
 * than the only lock.
 *
 * Runs on the Edge runtime, so it reads the JWT directly instead of importing
 * auth.ts (which pulls in mysql2 and cannot run on Edge).
 */

const ADMIN_ROLES = new Set(["admin", "superadmin"]);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET,
    // NextAuth v5 prefixes the cookie with `__Secure-` behind HTTPS.
    secureCookie: process.env.NODE_ENV === "production",
  });

  const role = (token?.role as string | undefined) ?? null;
  const isAdmin = !!role && ADMIN_ROLES.has(role);

  // Already signed in as an admin and sitting on the login page — send them in.
  if (pathname === "/admin/login") {
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  if (!isAdmin) {
    const loginUrl = new URL("/admin/login", req.url);
    // Preserve where they were headed so login can bounce them back.
    loginUrl.searchParams.set("from", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Matches /admin and everything under it, but never /api/* (those routes do
   * their own checks and must be able to return JSON 401/403 rather than a
   * redirect), and never static assets.
   */
  matcher: ["/admin", "/admin/:path*"],
};
