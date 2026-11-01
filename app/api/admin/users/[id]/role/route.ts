import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/lib/core/audit";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { toPublicUser } from "@/lib/public-user";
import { updateUserRoleSchema } from "@shared/schema.mysql";
import { z } from "zod";

/**
 * PATCH /api/admin/users/:id/role
 *
 * Superadmin only. Any admin could previously promote anyone, themselves
 * included, to any role.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireSuperadmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }
    if (userId === adminAuth.id) {
      return NextResponse.json({ message: "You can't change your own role" }, { status: 400 });
    }

    const target = await storage.getUser(userId);
    if (!target || target.role === "deleted") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { role } = updateUserRoleSchema.parse(await req.json());
    const updatedUser = await storage.updateUserRole(userId, role);
    logAdminAction({
      adminId: adminAuth.id,
      action: "user.role",
      targetType: "user",
      targetId: userId,
      summary: `Changed @${target.username} from ${target.role ?? "member"} to ${role}`,
      details: { from: target.role, to: role },
    });
    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Takes effect at the member's next sign-in (the role is in their session token).
    return NextResponse.json(toPublicUser(updatedUser), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 });
    }
    console.error("Failed to update user role:", error);
    return NextResponse.json({ message: "Failed to update user role" }, { status: 500 });
  }
}
