import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { promotionPlans, promotionRequests, appSettings } from "@shared/schema.mysql";
import { eq } from "drizzle-orm";
import { z } from "zod";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover" as any,
});

const checkoutSchema = z.object({
  planId: z.number().int().positive(),
  customEngagementCount: z.number().int().positive(),
  socialMediaUrl: z.string().url(),
  platform: z.string(),
  engagementType: z.string(),
  additionalDetails: z.string().optional(),
});

// POST /api/promotion/create-checkout
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const body = await req.json();
    const validatedData = { ...checkoutSchema.parse(body), userId };

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
    const amountInCents = Math.round(totalPrice * 100);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${plan.name} - ${validatedData.engagementType}`,
              description: `${validatedData.customEngagementCount} ${validatedData.engagementType} for ${validatedData.platform}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/promote-me?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/promote-me?status=cancelled`,
      metadata: {
        userId: validatedData.userId.toString(),
        planId: validatedData.planId.toString(),
        customEngagementCount: validatedData.customEngagementCount.toString(),
      },
    });

    // Store promotion request in database with status "pending_payment"
    const insertRes = await db.insert(promotionRequests).values({
      userId: validatedData.userId,
      planId: validatedData.planId,
      socialMediaUrl: validatedData.socialMediaUrl,
      platform: validatedData.platform,
      engagementType: validatedData.engagementType,
      additionalDetails: validatedData.additionalDetails || null,
      status: "pending_payment",
      price: totalPrice.toFixed(2),
      customEngagementCount: validatedData.customEngagementCount,
      paymentStatus: "unpaid",
      stripeSessionId: session.id,
      requestedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        sessionId: session.id,
        sessionUrl: session.url,
        promotionRequestId: insertRes[0].insertId,
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
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { message: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
