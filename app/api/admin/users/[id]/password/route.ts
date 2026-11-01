import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/lib/core/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { auth, hashPassword } from "@/auth";
import { updateUserPasswordSchema } from "@shared/schema.mysql";
import { z } from "zod";

// PATCH /api/admin/users/:id/password
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const target = await storage.getUser(userId);
    if (!target || target.role === "deleted") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    const session = await auth();
    if ((target.role === "admin" || target.role === "superadmin") && session?.user?.role !== "superadmin" && userId !== adminAuth.id) {
      return NextResponse.json({ message: "Only a superadmin can reset another admin's password" }, { status: 403 });
    }

    const { password } = updateUserPasswordSchema.parse(await req.json());

    // This used to store the password as typed: the account could then never
    // sign in (the login compares against a scrypt hash) and the plain text
    // sat in the database.
    await storage.updateUserPassword(userId, await hashPassword(password));
    logAdminAction({
      adminId: adminAuth.id,
      action: "user.password_reset",
      targetType: "user",
      targetId: userId,
      summary: `Reset the password of @${target.username}`,
    });

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 });
    }
    console.error("Failed to update password:", error);
    return NextResponse.json({ message: "Failed to update password" }, { status: 500 });
  }
}
