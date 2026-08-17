import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "@/lib/core/storage";

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

/** Roles permitted to use the admin panel. Single source of truth. */
export const ADMIN_ROLES = ["admin", "superadmin"] as const;

export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

// Augment the session type to include our custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    isAdmin?: boolean;
  }
}

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET,
  session: {
    strategy: "jwt" as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
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
          // Update login streak asynchronously
          storage.updateLoginStreak(user.id).catch(() => {});
          return {
            id: String(user.id),
            name: user.displayName ?? user.username,
            email: user.email,
            image: user.avatar ?? null,
            role: user.role ?? "user",
            isAdmin: false,
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
      }
      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.isAdmin = (token.isAdmin as boolean) ?? false;
      return session;
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
