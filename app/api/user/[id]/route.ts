import { NextRequest, NextResponse } from "next/server";
import { auth, hasAdminAccess } from "@/auth";
import { storage } from "@/lib/core/storage";
import { toPublicUser } from "@/lib/public-user";
import { usernameProblem } from "@/lib/username";
import { updateUserSchema } from "@shared/schema.mysql";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const requestingUserId = parseInt(session.user.id, 10);
    const isAdmin = hasAdminAccess(session.user);

    if (requestingUserId !== userId && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(toPublicUser(user));
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json({ message: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const requestingUserId = parseInt(session.user.id, 10);
    const isAdmin = hasAdminAccess(session.user);

    if (requestingUserId !== userId && !isAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0]?.message ?? "Validation error" }, { status: 400 });
    }
    const validatedData = parsed.data;

    // Username / email changes: same rules as sign-up, and a clear message
    // instead of a database error when the new one is taken.
    const current = await storage.getUser(userId);
    if (!current) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    if (validatedData.username !== undefined) {
      validatedData.username = validatedData.username.trim();
      if (validatedData.username === current.username) {
        delete validatedData.username;
      } else {
        const problem = usernameProblem(validatedData.username);
        if (problem) return NextResponse.json({ message: problem }, { status: 400 });
        const taken = await storage.getUserByUsername(validatedData.username);
        if (taken && taken.id !== userId) {
          return NextResponse.json({ message: "That username is taken" }, { status: 409 });
        }
      }
    }
    if (validatedData.email !== undefined) {
      validatedData.email = validatedData.email.trim();
      if (validatedData.email.toLowerCase() === current.email.toLowerCase()) {
        delete validatedData.email;
      } else {
        const taken = await storage.getUserByEmail(validatedData.email);
        if (taken && taken.id !== userId) {
          return NextResponse.json({ message: "That email is already used by another account" }, { status: 409 });
        }
      }
    }

    const updatedUser = await storage.updateUserProfile(userId, validatedData);

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(toPublicUser(updatedUser));
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { message: "Failed to update user profile" },
      { status: 500 }
    );
  }
}
