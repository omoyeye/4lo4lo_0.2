import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { z } from "zod";

// PATCH /api/admin/users/:id/points
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

    const updatedUser = await storage.updateUserPoints(userId, points);
    if (!updatedUser) {
      return NextResponse.json(
        { message: "Failed to update points" },
        { status: 500 }
      );
    }

    // TODO: (Phase 9) Send real-time SSE update here.
    // const realTimeService = getRealTimeService();
    // if (realTimeService) {
    //   realTimeService.broadcastUserPointsUpdate(userId, updatedUser.points);
    // }

    const { password, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword, { status: 200 });
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
