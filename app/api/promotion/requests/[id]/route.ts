import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  promotionRequests,
  updatePromotionRequestSchema,
} from "@shared/schema.mysql";
import { eq } from "drizzle-orm";
import { z } from "zod";

// PATCH /api/promotion/requests/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireSuperadmin();
    if (adminAuth instanceof NextResponse) return adminAuth;
    const adminId = adminAuth.id;

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json(
        { message: "Invalid request ID" },
        { status: 400 }
      );
    }

    const [existingRequest] = await db
      .select()
      .from(promotionRequests)
      .where(eq(promotionRequests.id, requestId));

    if (!existingRequest) {
      return NextResponse.json(
        { message: "Promotion request not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = updatePromotionRequestSchema.parse(body);

    let updates: Record<string, unknown> = {
      ...validatedData,
      updatedAt: new Date(),
    };

    if (validatedData.status === "completed" && !existingRequest.completedAt) {
      updates.completedAt = new Date();
    }

    if (validatedData.assignedTo && !existingRequest.assignedTo) {
      updates.assignedTo = adminId;
    }

    await db
      .update(promotionRequests)
      .set(updates)
      .where(eq(promotionRequests.id, requestId));

    const [updatedRequest] = await db
      .select()
      .from(promotionRequests)
      .where(eq(promotionRequests.id, requestId));

    return NextResponse.json(updatedRequest, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating promotion request:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to update promotion request",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/promotion/requests/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireSuperadmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json(
        { message: "Invalid request ID" },
        { status: 400 }
      );
    }

    await db
      .delete(promotionRequests)
      .where(eq(promotionRequests.id, requestId));

    return NextResponse.json(
      { message: "Promotion request deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting promotion request:", error);
    return NextResponse.json(
      { message: "Failed to delete promotion request" },
      { status: 500 }
    );
  }
}
