import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "@/lib/core/storage";
import { adminOtpEnabled, verifyAdminCode } from "@/lib/admin-otp";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !stored.includes(".")) return false;
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  // timingSafeEqual throws on length mismatch, so treat that as "no match"
  // rather than a 500, which is what a malformed stored hash would cause.
  if (hashedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * The role on a session token is copied at sign-in and the token lives a
 * week, so a deleted account kept working and a demoted admin kept admin
 * access until it expired. Each request re-reads the role, cached per
 * instance for a minute to spare the database a lookup on every call.
 * Returns null for an account that no longer exists or was deleted.
 */
const ROLE_TTL_MS = 60_000;
const roleCache = new Map<number, { role: string | null; at: number }>();

async function currentRole(userId: number, fallback: string): Promise<string | null> {
  const hit = roleCache.get(userId);
  if (hit && Date.now() - hit.at < ROLE_TTL_MS) return hit.role;
  try {
    const user = await storage.getUser(userId);
    const role = !user || user.role === "deleted" ? null : user.role ?? "user";
    if (roleCache.size > 5000) roleCache.clear();
    roleCache.set(userId, { role, at: Date.now() });
    return role;
  } catch {
    // A database hiccup shouldn't sign everyone out; keep the token's role.
    return fallback;
  }
}

/** Roles permitted to use the admin panel. Single source of truth. */
export const ADMIN_ROLES = ["admin", "superadmin"] as const;

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

/**
 * May this session use the admin panel and admin APIs? Needs an admin role AND
 * a sign-in confirmed with the emailed code (lib/admin-otp.ts). An admin who
 * signed in with only their password, on the member login or the app, is
 * treated as a regular member until they sign in at /admin/login.
 */
export function hasAdminAccess(user: { role?: string | null; adminVerified?: boolean } | null | undefined): boolean {
  if (!user || !isAdminRole(user.role)) return false;
  return !adminOtpEnabled() || user.adminVerified === true;
}

// Augment the session type to include our custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isAdmin: boolean;
      adminVerified?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    isAdmin?: boolean;
    adminVerified?: boolean;
  }
}

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET,
  session: {
    strategy: "jwt" as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        // Only sent by /api/admin/login after the emailed code step.
        adminChallenge: { label: "Admin challenge", type: "text" },
        adminCode: { label: "Admin code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        try {
          const user = await storage.getUserByUsername(
            credentials.username as string
          );
          if (!user) return null;
          const valid = await comparePasswords(
            credentials.password as string,
            user.password
          );
          if (!valid) return null;
          return {
            id: String(user.id),
            name: user.displayName ?? user.username,
            email: user.email,
            image: user.avatar ?? null,
            role: user.role ?? "user",
            isAdmin: false,
            adminVerified:
              isAdminRole(user.role) &&
              verifyAdminCode(user, credentials.adminChallenge as string | undefined, credentials.adminCode as string | undefined),
          };
        } catch {
          return null;
        }
      },
    }),

    /*
     * Google OAuth is disabled.
     *
     * The provider and its signIn branch (which created a user row on first
     * Google login) were removed here. Nothing else was touched: the
     * `users.google_id` column, `storage.getUserByGoogleId()` and existing
     * Google-created rows are all intact, so re-enabling is a revert of this
     * commit plus setting GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
     *
     * NOTE: accounts created through Google hold a random password generated
     * at signup, which their owner has never seen. While this is disabled they
     * can only get in via the forgot-password flow, and only if their stored
     * email is real. Signups where Google returned no email were given a
     * synthetic `<googleId>@google.user` address and have no recovery path.
     * See scripts/sql/004-google-account-audit.sql.
     */
  ],

  callbacks: {
    async signIn() {
      return true;
    },

    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "user";
        token.isAdmin = user.isAdmin ?? false;
        token.adminVerified = user.adminVerified === true;
        return token;
      }
      const id = parseInt(token.id, 10);
      if (Number.isFinite(id)) {
        const role = await currentRole(id, token.role ?? "user");
        if (role === null) return null; // deleted: the session ends
        if (role !== token.role) {
          token.role = role;
          // A role change always needs a fresh emailed code for admin access.
          token.adminVerified = false;
        }
      }
      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.isAdmin = (token.isAdmin as boolean) ?? false;
      session.user.adminVerified = token.adminVerified === true;
      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
