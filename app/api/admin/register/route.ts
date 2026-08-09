import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { hashPassword } from "@/auth";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const createAdminSchema = z.object({
  username: z.string().min(3).max(255),
  email: z.string().email(),
  password: z.string().min(8, "Admin passwords must be at least 8 characters"),
  role: z.enum(["admin", "superadmin"]).default("admin"),
});

/**
 * POST /api/admin/register — create an admin directory entry.
 *
 * Superadmin-only. Note this writes to the `admins` table; panel authorization
 * itself is driven by `users.role`, so a new admin also needs their user row
 * promoted (see scripts/sql/002-link-legacy-admins.sql).
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, LIMITS.register);
  if (limited) return limited;

  try {
    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const data = createAdminSchema.parse(body);

    const existing = await storage.getAdminByUsername(data.username);
    if (existing) {
      return NextResponse.json(
        { message: "An admin with that username already exists" },
        { status: 409 }
      );
    }

    const admin = await storage.createAdmin({
      username: data.username,
      email: data.email,
      password: await hashPassword(data.password),
      role: data.role,
      status: "active",
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const { password, ...safe } = admin;
    return NextResponse.json(safe, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create admin:", error);
    return NextResponse.json(
      { message: "Failed to create admin" },
      { status: 500 }
    );
  }
}
