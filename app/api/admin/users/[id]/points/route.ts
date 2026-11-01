import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/lib/core/audit";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { toPublicUser } from "@/lib/public-user";
import { z } from "zod";

// PATCH /api/admin/users/:id/points
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
      return NextResponse.json(
        { message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { points } = z.object({ points: z.number().int() }).parse(body);

    const userBefore = await storage.getUser(userId);
    if (!userBefore) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    if (points < 0 && userBefore.points + points < 0) {
      return NextResponse.json(
        { message: `@${userBefore.username} only has ${userBefore.points.toLocaleString()} points` },
        { status: 400 }
      );
    }

    const updatedUser = await storage.updateUserPoints(userId, points);
    if (!updatedUser) {
      return NextResponse.json(
        { message: "Failed to update points" },
        { status: 500 }
      );
    }

    logAdminAction({
      adminId: adminAuth.id,
      action: "points.adjust",
      targetType: "user",
      targetId: userId,
      summary: `${points > 0 ? "Added" : "Removed"} ${Math.abs(points).toLocaleString()} points ${points > 0 ? "to" : "from"} @${userBefore.username} (${userBefore.points} → ${updatedUser.points})`,
      details: { points, before: userBefore.points, after: updatedUser.points },
    });

    return NextResponse.json(toPublicUser(updatedUser), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to update points:", error);
    return NextResponse.json(
      { message: "Failed to update points" },
      { status: 500 }
    );
  }
}
