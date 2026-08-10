import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Server-side gate for the admin area.
 *
 * Named proxy.ts, not middleware.ts: Next 16 deprecated the middleware file
 * convention and warns on every build. Same behaviour, same matcher.
 *
 * Before this existed, /admin/* was protected only by a client-side useEffect
 * in lib/admin-protected-route.tsx. The HTML was publicly fetchable and the
 * guard could be skipped by disabling JS. The API routes were (and remain)
 * guarded independently by requireAdmin(), so this is defence in depth rather
 * than the only lock.
 *
 * Runs on the Edge runtime, so it reads the JWT directly instead of importing
 * auth.ts (which pulls in mysql2 and cannot run on Edge).
 */

const ADMIN_ROLES = new Set(["admin", "superadmin"]);

const SECRET = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET;

/**
 * Read the session token without assuming which cookie name was used.
 *
 * THIS IS WHY ADMIN LOGIN APPEARED TO FAIL.
 *
 * This used to pass `secureCookie: NODE_ENV === "production"`, which makes
 * getToken look for `__Secure-authjs.session-token`. But NextAuth chooses the
 * cookie name from the URL protocol, not from NODE_ENV, and this deployment
 * has NEXTAUTH_URL set to http://localhost:3000. Seeing an http URL, NextAuth
 * wrote the unprefixed `authjs.session-token`.
 *
 * So sign-in genuinely worked, set one cookie, and this gate then looked for a
 * different one, found nothing, decided the visitor was not an admin and
 * redirected back to /admin/login. An endless bounce that looks exactly like
 * "my password is not accepted".
 *
 * Trying both names removes the dependency on NEXTAUTH_URL being correct.
 * Fixing NEXTAUTH_URL is still worth doing (it is used for callbacks and
 * Stripe return URLs) but admin access no longer hinges on it.
 */
async function readToken(req: NextRequest) {
  for (const secureCookie of [true, false]) {
    try {
      const token = await getToken({ req, secret: SECRET, secureCookie });
      if (token) return token;
    } catch {
      // Wrong cookie name or undecodable; try the other variant.
    }
  }
  return null;
}

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const token = await readToken(req);

  const role = (token?.role as string | undefined) ?? null;
  const isAdmin = !!role && ADMIN_ROLES.has(role);

  // Already signed in as an admin and sitting on the login page, so send them in.
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
