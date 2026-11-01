import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { toPublicUser } from "@/lib/public-user";
import { auth, hashPassword } from "@/auth";
import { z } from "zod";

// GET /api/admin/users
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const users = await storage.getAllUsers();
    return NextResponse.json(users.map(toPublicUser), { status: 200 });
  } catch (error) {
    console.error("Failed to get users:", error);
    return NextResponse.json(
      { message: "Failed to get users" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(50).regex(/^[A-Za-z0-9_.-]+$/, "Letters, numbers, dot, dash and underscore only"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().trim().max(255).optional().nullable(),
  role: z.enum(["member", "admin"]).optional(),
});

/**
 * POST /api/admin/users
 *
 * Previously stored the password unhashed (so the account could never sign
 * in), had no referral code, and let any admin create other admins.
 */
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const data = createSchema.parse(await req.json());

    const session = await auth();
    if (data.role === "admin" && session?.user?.role !== "superadmin") {
      return NextResponse.json({ message: "Only a superadmin can create admin accounts" }, { status: 403 });
    }

    if (await storage.getUserByUsername(data.username)) {
      return NextResponse.json({ message: "Username already taken" }, { status: 400 });
    }
    if (await storage.getUserByEmail(data.email)) {
      return NextResponse.json({ message: "An account with this email already exists" }, { status: 400 });
    }

    const newUser = await storage.createUser({
      username: data.username,
      email: data.email,
      password: await hashPassword(data.password),
      displayName: data.displayName || null,
      role: data.role ?? "member",
      referralCode: nanoid(8),
      platform: "local",
    } as Parameters<typeof storage.createUser>[0]);
    return NextResponse.json(toPublicUser(newUser), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message ?? "Invalid details", errors: error.errors }, { status: 400 });
    }
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { message: "Failed to create user" },
      { status: 500 }
    );
  }
}
