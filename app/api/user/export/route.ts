import { NextResponse } from "next/server";
import { desc, eq, or } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { storage } from "@/lib/core/storage";
import { toPublicUser } from "@/lib/public-user";
import { myProofs } from "@/lib/core/proofs";
import { referrals, userTasks } from "@shared/schema.mysql";

/**
 * GET /api/user/export, "Download my data" (right of access / portability:
 * UK & EU GDPR Art. 15/20, NDPA s.34, CCPA). A JSON file of everything tied
 * to the signed-in account.
 */
export async function GET() {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  const user = await storage.getUser(userId);
  if (!user || user.role === "deleted") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const [completions, payouts, notifications, badges, refs, proofs] = await Promise.all([
    db.select().from(userTasks).where(eq(userTasks.userId, userId)).orderBy(desc(userTasks.completedAt)),
    storage.getUserPayouts(userId),
    storage.getUserNotifications(userId, 1000),
    storage.getUserBadges(userId).catch(() => []),
    db.select().from(referrals).where(or(eq(referrals.referrerId, userId), eq(referrals.referredId, userId))),
    myProofs(userId).catch(() => []),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    notice: "Your 4LO4LO account data. Payout details you entered are included in withdrawals. Questions: support@4lo4lo.site",
    account: toPublicUser(user),
    taskCompletions: completions,
    taskProofs: proofs.map(({ image_url, ...p }) => ({ ...p, image: image_url })),
    withdrawals: payouts,
    referrals: refs.map((r) => ({ ...r, youAre: r.referrerId === userId ? "referrer" : "referred" })),
    badges: badges.map((b) => ({ badge: b.badge?.title, earnedAt: (b as { earnedAt?: unknown }).earnedAt ?? null })),
    notifications,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="4lo4lo-data-${user.username}-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
