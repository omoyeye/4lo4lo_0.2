import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { notificationService } from "@/lib/core/notification-service";
import { z } from "zod";

const patchSchema = z.object({
  // `processedBy` is accepted for backwards compatibility but ignored — the
  // acting admin is taken from the session, never from the request body.
  status: z.enum(["pending", "processing", "completed", "rejected"]),
  processedBy: z.number().optional(),
});

/**
 * PATCH /api/admin/payouts/:id — approve / reject / progress a payout.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
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

    // Terminal states are final — re-processing a completed payout is how
    // double payments happen.
    if (existing.status === "completed" || existing.status === "rejected") {
      return NextResponse.json(
        {
          message: `Payout is already ${existing.status} and cannot be changed`,
        },
        { status: 409 }
      );
    }

    const updated = await storage.updatePayoutStatus(payoutId, status, auth.id);

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
