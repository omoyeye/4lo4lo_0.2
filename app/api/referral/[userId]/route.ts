import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId: paramId } = await params;
    const userId = parseInt(paramId, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const requestingUserId = parseInt(session.user.id, 10);
    if (requestingUserId !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const referrer = await storage.getUser(userId);
    if (!referrer) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Get referral stats
    const referralStats = await storage.getReferralStats(userId);

    return NextResponse.json(
      {
        totalReferrals: referralStats.totalReferrals,
        coinsEarned: referralStats.totalPoints,
        referralCode: referrer.referralCode,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to get referral data:", error);
    return NextResponse.json(
      { message: "Failed to get referral data" },
      { status: 500 }
    );
  }
}
