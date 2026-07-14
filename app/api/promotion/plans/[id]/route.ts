import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { promotionPlans, updatePromotionPlanSchema } from "@shared/schema.mysql";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireSuperadmin();
    if (adminAuth instanceof NextResponse) return adminAuth;
    const adminId = adminAuth.id;

    const { id } = await params;
    const planId = parseInt(id, 10);
    if (isNaN(planId)) {
      return NextResponse.json({ message: "Invalid plan ID" }, { status: 400 });
    }

    const [existingPlan] = await db
      .select()
      .from(promotionPlans)
      .where(eq(promotionPlans.id, planId));

    if (!existingPlan) {
      return NextResponse.json(
        { message: "Promotion plan not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = updatePromotionPlanSchema.parse(body);

    const updates = {
      ...validatedData,
      updatedAt: new Date(),
      updatedBy: adminId,
    };

    await db
      .update(promotionPlans)
      .set(updates)
      .where(eq(promotionPlans.id, planId));

    const [updatedPlan] = await db
      .select()
      .from(promotionPlans)
      .where(eq(promotionPlans.id, planId));

    return NextResponse.json(updatedPlan, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating promotion plan:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to update promotion plan",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireSuperadmin();
    if (adminAuth instanceof NextResponse) return adminAuth;
    const adminId = adminAuth.id;

    const { id } = await params;
    const planId = parseInt(id, 10);
    if (isNaN(planId)) {
      return NextResponse.json({ message: "Invalid plan ID" }, { status: 400 });
    }

    // Instead of deleting, mark as inactive
    await db
      .update(promotionPlans)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: adminId,
      })
      .where(eq(promotionPlans.id, planId));

    return NextResponse.json({ message: "Plan deactivated" }, { status: 200 });
  } catch (error) {
    console.error("Error deactivating promotion plan:", error);
    return NextResponse.json(
      { message: "Failed to deactivate promotion plan" },
      { status: 500 }
    );
  }
}
