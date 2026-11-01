import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/lib/core/audit";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { notificationService } from "@/lib/core/notification-service";
import { z } from "zod";
import { settlePayout } from "@/lib/core/payouts";

const patchSchema = z.object({
  // `processedBy` is accepted for backwards compatibility but ignored, the
  // acting admin is taken from the session, never from the request body.
  status: z.enum(["pending", "processing", "completed", "rejected"]),
  processedBy: z.number().optional(),
});

/**
 * PATCH /api/admin/payouts/:id, approve / reject / progress a payout.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const payoutId = parseInt(id, 10);
    if (isNaN(payoutId)) {
      return NextResponse.json(
        { message: "Invalid payout ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status } = patchSchema.parse(body);

    const existing = await storage.getPayoutById(payoutId);
    if (!existing) {
      return NextResponse.json({ message: "Payout not found" }, { status: 404 });
    }

    // Terminal states are final, re-processing a completed payout is how
    // double payments happen.
    if (existing.status === "completed" || existing.status === "rejected") {
      return NextResponse.json(
        {
          message: `Payout is already ${existing.status} and cannot be changed`,
        },
        { status: 409 }
      );
    }

    // Refund or finalize the reserved points before recording the status.
    await settlePayout(existing, status);
    const updated = await storage.updatePayoutStatus(payoutId, status, auth.id);
    logAdminAction({
      adminId: auth.id,
      action: "payout.update",
      targetType: "payout",
      targetId: payoutId,
      summary: `Marked payout #${payoutId} (${existing.amount.toLocaleString()} points, user #${existing.userId}) as ${status}`,
      details: { from: existing.status, to: status, amount: existing.amount, userId: existing.userId },
    });

    notificationService
      .notifyPayoutProcessed(existing.userId, existing.amount, status)
      .catch((err) =>
        console.error("Failed to notify user of payout update:", err)
      );

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to update payout:", error);
    return NextResponse.json(
      { message: "Failed to update payout" },
      { status: 500 }
    );
  }
}
