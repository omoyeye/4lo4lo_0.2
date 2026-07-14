import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { storage } from "@/lib/core/storage";
import { AuthError } from "next-auth";

/**
 * POST /api/login
 * Authenticates the user via username + password.
 * Uses NextAuth credentials provider under the hood.
 */
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required" },
        { status: 400 }
      );
    }

    // Use NextAuth's signIn action (server-side)
    await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    // After sign-in, fetch the fresh user for the response
    const user = await storage.getUserByUsername(username);
    if (user) {
      await storage.updateLoginStreak(user.id).catch(() => {});
      const freshUser = await storage.getUser(user.id).catch(() => user);
      return NextResponse.json(freshUser, { status: 200 });
    }

    return NextResponse.json({ message: "Login successful" }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }
    console.error("Login error:", error);
    return NextResponse.json({ message: "Login failed" }, { status: 500 });
  }
}
