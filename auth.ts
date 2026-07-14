import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { scrypt, timingSafeEqual, randomBytes } from "crypto";
import { promisify } from "util";
import { nanoid } from "nanoid";
import { storage } from "@/lib/core/storage";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !stored.includes(".")) return false;
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET,
  session: {
    strategy: "jwt",
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

    // Google OAuth — only activated when env vars are set
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth user creation / lookup
      if (account?.provider === "google" && profile) {
        try {
          const googleId = profile.sub as string;
          let dbUser = await storage.getUserByGoogleId(googleId);
          if (!dbUser) {
            const username = `google_${googleId}`;
            const email =
              (profile.email as string) ?? `${googleId}@google.user`;
            const displayName = (profile.name as string) ?? username;
            const password = randomBytes(32).toString("hex");
            const hashedPassword = await hashPassword(password);
            dbUser = await storage.createUser({
              username,
              password: hashedPassword,
              email,
              displayName,
              googleId,
              referralCode: nanoid(8),
              role: "user",
              avatar: (profile.picture as string) ?? null,
              platform: "google",
            });
          }
          // Inject db user id so jwt callback can pick it up
          user.id = String(dbUser.id);
          user.role = dbUser.role ?? "user";
        } catch {
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? "user";
        token.isAdmin = (user as any).isAdmin ?? false;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.isAdmin = (token.isAdmin as boolean) ?? false;
      return session;
    },
  },
});
