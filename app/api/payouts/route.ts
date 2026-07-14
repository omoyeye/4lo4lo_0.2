import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";
import { z } from "zod";
import { notificationService } from "@/lib/core/notification-service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const schema = z.object({
      amount: z.number().int().positive(),
      paymentMethod: z.string().min(1),
      paymentDetails: z.string().optional(),
    });

    const body = await req.json();
    const data = schema.parse(body);
    const userId = parseInt(session.user.id, 10);

    const payout = await storage.createPayout({
      userId,
      amount: data.amount,
      status: "pending",
      paymentMethod: data.paymentMethod,
      paymentDetails: data.paymentDetails || null,
      requestedAt: new Date(),
      processedAt: null,
      processedBy: null,
    });

    // TODO (Phase 9): Send SSE notification to admins
    // realTimeService.broadcastToAdmins({ ... })

    // Create in-app notification for admin about withdrawal request
    const user = await storage.getUser(userId);
    if (user) {
      notificationService
        .notifyAdminWithdrawalRequest(
          user.id,
          user.username,
          data.amount,
          payout.id
        )
        .catch((err: any) =>
          console.error("Failed to send withdrawal notification:", err)
        );
    }

    return NextResponse.json(
      {
        message: "Payout request submitted successfully",
        payout,
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
    console.error("Failed to create payout request:", error);
    return NextResponse.json(
      { message: "Failed to create payout request" },
      { status: 500 }
    );
  }
}
