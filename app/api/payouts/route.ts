import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";
import { z } from "zod";
import { notificationService } from "@/lib/core/notification-service";
import { PayoutError, requestPayout } from "@/lib/core/payouts";
import { passesEmailGate } from "@/lib/core/email-verification";

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

    const account = await storage.getUser(userId);
    if (!account || account.role === "deleted") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!(await passesEmailGate(account))) {
      return NextResponse.json(
        { message: "Confirm your email address before requesting a payout.", code: "EMAIL_NOT_VERIFIED" },
        { status: 403 }
      );
    }

    let payout;
    try {
      payout = await requestPayout(account, {
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDetails: data.paymentDetails || null,
      });
    } catch (err) {
      if (err instanceof PayoutError) {
        return NextResponse.json({ message: err.message, code: err.code }, { status: err.status });
      }
      throw err;
    }

    // In-app notification for admins about the withdrawal request.
    notificationService
      .notifyAdminWithdrawalRequest(account.id, account.username, data.amount, payout.id)
      .catch((err: any) => console.error("Failed to send withdrawal notification:", err));

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
