import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/lib/core/audit";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { anonymizeUser } from "@/lib/core/account-deletion";
import { auth } from "@/auth";

/**
 * DELETE /api/admin/users/:id
 *
 * Anonymizes the account (lib/core/account-deletion.ts) instead of deleting
 * the row, so referral counts and the payout ledger stay intact.
 */
export async function DELETE(
  _req: NextRequest,
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
      return NextResponse.json({ message: "You can't delete your own account from the admin panel" }, { status: 400 });
    }

    const target = await storage.getUser(userId);
    if (!target || target.role === "deleted") {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Only a superadmin may remove another admin.
    const session = await auth();
    if ((target.role === "admin" || target.role === "superadmin") && session?.user?.role !== "superadmin") {
      return NextResponse.json({ message: "Only a superadmin can delete an admin account" }, { status: 403 });
    }

    await anonymizeUser(userId);
    logAdminAction({
      adminId: adminAuth.id,
      action: "user.delete",
      targetType: "user",
      targetId: userId,
      summary: `Deleted the account of @${target.username} (${target.email})`,
      details: { role: target.role, points: target.points },
    });
    return NextResponse.json({ message: "Account deleted" }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ message: "Failed to delete user" }, { status: 500 });
  }
}
