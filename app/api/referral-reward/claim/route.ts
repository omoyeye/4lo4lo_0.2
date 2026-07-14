import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";
import { z } from "zod";

export async function POST(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    // Get reward info to validate eligibility
    const rewardInfo = await storage.getReferralRewardInfo(userId);

    if (!rewardInfo.eligibleToClaim) {
      return NextResponse.json(
        {
          message:
            "Not eligible to claim. You need at least 20 referrals and claimable referrals available.",
        },
        { status: 400 }
      );
    }

    // Create the claim
    const claim = await storage.createReferralRewardClaim(
      userId,
      rewardInfo.claimableReferrals,
      rewardInfo.claimableAmount
    );

    return NextResponse.json(
      {
        message: "Claim submitted successfully. Your request is pending review.",
        claim,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create claim:", error);
    return NextResponse.json(
      { message: "Failed to create claim" },
      { status: 500 }
    );
  }
}
