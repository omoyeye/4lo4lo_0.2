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

    const claims = await storage.getReferralRewardClaims(userId);
    return NextResponse.json(claims, { status: 200 });
  } catch (error) {
    console.error("Failed to get claim history:", error);
    return NextResponse.json(
      { message: "Failed to get claim history" },
      { status: 500 }
    );
  }
}
