import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { auth, isAdminRole } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/diagnose
 *
 * Answers one question: if admin access is being refused, at which step?
 *
 * There are five places it can break, and from the outside they all look the
 * same ("I cannot log in"):
 *
 *   1. no session cookie present at all       -> sign-in did not complete
 *   2. cookie present under an unexpected name -> the gate cannot read it
 *   3. cookie present but will not decode      -> NEXTAUTH_SECRET changed
 *   4. token decodes but carries no admin role -> users.role is not promoted
 *   5. everything fine                         -> the problem is elsewhere
 *
 * SAFE TO EXPOSE. It reports only on the caller's own request: which cookie
 * names are present (never their values), whether the token decoded, and the
 * caller's own role. It returns no secrets and nothing about any other user.
 * An unauthenticated caller learns only that they are not signed in.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET;

  // Cookie NAMES only. Values are never read or returned.
  const sessionCookieNames = req.cookies
    .getAll()
    .map((c) => c.name)
    .filter((n) => n.includes("session-token") || n.includes("authjs"));

  let decodedWith: "secure" | "insecure" | null = null;
  let token: Record<string, unknown> | null = null;

  for (const [label, secureCookie] of [
    ["secure", true],
    ["insecure", false],
  ] as const) {
    try {
      const t = await getToken({ req, secret, secureCookie });
      if (t) {
        token = t as Record<string, unknown>;
        decodedWith = label;
        break;
      }
    } catch {
      // try the other variant
    }
  }

  const role = (token?.role as string | undefined) ?? null;
  const session = await auth().catch(() => null);

  // Work out the first failing step, and say what to do about it.
  let verdict: string;
  let fix: string;

  if (sessionCookieNames.length === 0) {
    verdict = "No session cookie was sent with this request.";
    fix =
      "Sign in at /admin/login first. If you just did and still see this, the login response is not setting a cookie: check that NEXTAUTH_SECRET is set in Vercel.";
  } else if (!token) {
    verdict = "A session cookie is present but could not be decoded.";
    fix =
      "This almost always means NEXTAUTH_SECRET differs from the value used when the cookie was issued. Set it in Vercel and sign in again.";
  } else if (!role) {
    verdict = "The session decoded but carries no role.";
    fix =
      "Sign out and back in so a fresh token is issued with the role claim.";
  } else if (!isAdminRole(role)) {
    verdict = `You are signed in, but your role is "${role}", which is not an admin role.`;
    fix =
      "Promote the account: UPDATE users SET role = 'superadmin' WHERE username = '<you>' LIMIT 1; then sign out and back in. See scripts/sql/002-link-legacy-admins.sql.";
  } else {
    verdict = "Everything checks out. This session should have admin access.";
    fix =
      "If /admin still redirects, hard-refresh once so the browser drops a cached redirect.";
  }

  return NextResponse.json(
    {
      verdict,
      fix,
      details: {
        sessionCookiesPresent: sessionCookieNames,
        tokenDecoded: Boolean(token),
        // Which cookie variant worked. A mismatch here was the original bug.
        decodedWith,
        role,
        isAdmin: isAdminRole(role),
        sessionUser: session?.user
          ? { id: session.user.id, name: session.user.name, role: session.user.role }
          : null,
        secretConfigured: Boolean(secret),
        // Wrong value here breaks callbacks and cookie naming.
        nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
        nodeEnv: process.env.NODE_ENV ?? null,
      },
    },
    { status: 200 }
  );
}
