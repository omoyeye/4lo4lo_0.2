import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { toPublicUser } from "@/lib/public-user";

/** Next streak milestone after `streak`, for the "3 days to +50" hint. */
async function nextMilestone(streak: number) {
  const { milestones } = await storage.getStreakSettings();
  const next = [...milestones].sort((a, b) => a.streak - b.streak).find((m) => m.streak > streak);
  return next ? { streak: next.streak, bonusPoints: next.bonusPoints, daysLeft: next.streak - streak } : null;
}

/** GET /api/user/checkin, today's check-in state without checking in. */
export async function GET() {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;
  const user = await storage.getUser(userId);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const streak = user.streakCount || 0;
  return NextResponse.json({
    checkedInToday: user.lastLoginDate === today,
    streak,
    nextMilestone: await nextMilestone(streak),
  });
}

// POST /api/user/checkin
export async function POST(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const result = await storage.dailyCheckIn(userId);
    if (!result) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const newBadgeKeys = await storage.checkAndAwardBadges(userId);
    return NextResponse.json({
      user: toPublicUser(result.user),
      newBadgeKeys,
      checkIn: {
        checkedInNow: result.checkedInNow,
        checkedInToday: true,
        streak: result.streak,
        pointsAwarded: result.pointsAwarded,
        bonusAwarded: result.bonusAwarded,
        nextMilestone: await nextMilestone(result.streak),
      },
    });
  } catch (error) {
    console.error("Failed to process check-in:", error);
    return NextResponse.json(
      { message: "Failed to process check-in" },
      { status: 500 }
    );
  }
}
