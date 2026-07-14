import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { promotionPlans, promotionRequests, appSettings } from "@shared/schema.mysql";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { storage } from "@/lib/core/storage";

const payWithPointsSchema = z.object({
  planId: z.number().int().positive(),
  customEngagementCount: z.number().int().positive(),
  socialMediaUrl: z.string().url(),
  platform: z.string(),
  engagementType: z.string(),
  additionalDetails: z.string().optional(),
});

// POST /api/promotion/pay-with-points
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const body = await req.json();
    const validatedData = { ...payWithPointsSchema.parse(body), userId };

    // Get the plan details
    const [plan] = await db
      .select()
      .from(promotionPlans)
      .where(eq(promotionPlans.id, validatedData.planId));

    if (!plan) {
      return NextResponse.json(
        { message: "Promotion plan not found" },
        { status: 404 }
      );
    }

    if (!plan.isActive) {
      return NextResponse.json(
        { message: "This promotion plan is no longer active" },
        { status: 400 }
      );
    }

    // Calculate total price
    const totalPrice =
      (validatedData.customEngagementCount / plan.engagementCount) *
      parseFloat(plan.price);

    // Get the points_to_currency_rate setting
    const [rateSetting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "points_to_currency_rate"));

    const conversionRate = parseFloat(rateSetting?.value || "0.001");
    const requiredPoints = Math.ceil(totalPrice / conversionRate);

    // Check if user has enough points
    const user = await storage.getUser(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.points < requiredPoints) {
      return NextResponse.json(
        {
          message: "Insufficient points",
          required: requiredPoints,
          available: user.points,
          shortfall: requiredPoints - user.points,
        },
        { status: 400 }
      );
    }

    // Deduct points from user
    const updatedUser = await storage.updateUserPoints(userId, -requiredPoints);
    if (!updatedUser) {
      return NextResponse.json(
        { message: "Failed to deduct points" },
        { status: 500 }
      );
    }

    // Create the promotion request with paid status
    const insertRes = await db.insert(promotionRequests).values({
      userId: validatedData.userId,
      planId: validatedData.planId,
      socialMediaUrl: validatedData.socialMediaUrl,
      platform: validatedData.platform,
      engagementType: validatedData.engagementType,
      additionalDetails: validatedData.additionalDetails || null,
      status: "pending",
      price: totalPrice.toFixed(2),
      customEngagementCount: validatedData.customEngagementCount,
      paymentStatus: "paid_with_points",
      pointsUsed: requiredPoints,
      requestedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Promotion request submitted successfully using points!",
        promotionRequestId: insertRes[0].insertId,
        pointsDeducted: requiredPoints,
        remainingPoints: updatedUser.points,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Error processing points payment:", error);
    return NextResponse.json(
      { message: "Failed to process points payment" },
      { status: 500 }
    );
  }
}
