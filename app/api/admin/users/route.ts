import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertUserSchema } from "@shared/schema.mysql";
import { z } from "zod";

// GET /api/admin/users
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const users = await storage.getAllUsers();
    const safeUsers = users.map(({ password, ...user }) => user);
    return NextResponse.json(safeUsers, { status: 200 });
  } catch (error) {
    console.error("Failed to get users:", error);
    return NextResponse.json(
      { message: "Failed to get users" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const body = await req.json();
    const userData = insertUserSchema.parse(body);

    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return NextResponse.json(
        { message: "Username already taken" },
        { status: 400 }
      );
    }

    const newUser = await storage.createUser(userData);
    const { password, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors }, { status: 400 });
    }
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { message: "Failed to create user" },
      { status: 500 }
    );
  }
}
