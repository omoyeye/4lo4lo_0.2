import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/payouts
 *
 * Returns every payout request joined with the requesting user, which is the
 * shape components/admin/PaymentRequests.tsx expects (PayoutWithUser).
 */
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const payouts = await storage.getAllPayouts();

    // Resolve users in one pass rather than N queries inside the map.
    const users = await storage.getAllUsers();
    const byId = new Map(users.map((u) => [u.id, u]));

    const withUser = payouts.map((p) => {
      const user = byId.get(p.userId);
      return {
        ...p,
        user: user
          ? {
              id: user.id,
              username: user.username,
              email: user.email,
              displayName: user.displayName,
              points: user.points,
            }
          : null,
      };
    });

    // Newest first, admins work the queue from the top.
    withUser.sort(
      (a, b) =>
        new Date(b.requestedAt as any).getTime() -
        new Date(a.requestedAt as any).getTime()
    );

    return NextResponse.json(withUser, { status: 200 });
  } catch (error) {
    console.error("Failed to list payouts:", error);
    return NextResponse.json(
      { message: "Failed to list payouts" },
      { status: 500 }
    );
  }
}
