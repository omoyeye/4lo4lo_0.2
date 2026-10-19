import { encode, decode } from "next-auth/jwt";

/**
 * Bearer tokens for the native app.
 *
 * The API identifies callers only through the NextAuth session cookie, and a
 * native client cannot rely on a cookie jar. The app instead sends
 * `Authorization: Bearer <token>`, and proxy.ts turns that into the session
 * cookies auth() already reads, so no route handler needs to know the app
 * exists.
 *
 * The token is a JWE under its own salt, so a stolen website cookie is not a
 * valid bearer token and vice versa. It is re-encoded under both possible
 * session cookie names because NextAuth picks the name from the request
 * protocol (see the note in proxy.ts), and each name is its own salt.
 */

export const MOBILE_TOKEN_SALT = "4lo4lo.mobile-session";
export const MOBILE_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

export const SESSION_COOKIE_PATTERN = /^(__Secure-)?authjs\.session-token(\.\d+)?=/;

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

export interface MobileTokenUser {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
  avatar: string | null;
  role: string | null;
}

export async function issueMobileToken(user: MobileTokenUser): Promise<string> {
  return encode({
    token: {
      sub: String(user.id),
      id: String(user.id),
      name: user.displayName ?? user.username,
      email: user.email,
      picture: user.avatar ?? null,
      role: user.role ?? "user",
      isAdmin: false,
    },
    secret: secret(),
    salt: MOBILE_TOKEN_SALT,
    maxAge: MOBILE_TOKEN_MAX_AGE,
  });
}

/** Returns a Cookie header fragment carrying the session, or null if the token is invalid or expired. */
export async function mobileTokenToSessionCookies(bearer: string): Promise<string | null> {
  const payload = await decode({
    token: bearer,
    secret: secret(),
    salt: MOBILE_TOKEN_SALT,
  }).catch(() => null);

  if (!payload?.id) return null;

  const now = Math.floor(Date.now() / 1000);
  const remaining = typeof payload.exp === "number" ? payload.exp - now : MOBILE_TOKEN_MAX_AGE;
  if (remaining <= 0) return null;

  const { iat: _iat, exp: _exp, jti: _jti, ...claims } = payload;

  const parts = await Promise.all(
    SESSION_COOKIE_NAMES.map(
      async (name) =>
        `${name}=${await encode({ token: claims, secret: secret(), salt: name, maxAge: remaining })}`
    )
  );
  return parts.join("; ");
}
