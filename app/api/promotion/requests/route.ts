import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireSuperadmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  promotionRequests,
  insertPromotionRequestSchema,
} from "@shared/schema.mysql";
import { eq } from "drizzle-orm";
import { notificationService } from "@/lib/core/notification-service";
import { storage } from "@/lib/core/storage";

// GET /api/promotion/requests?userId=<id>  (user) or all (superadmin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get("userId");

    if (userIdStr) {
      // User viewing their own requests
      const userId = await requireAuth();
      if (userId instanceof NextResponse) return userId;

      const userIdNum = parseInt(userIdStr, 10);
      if (isNaN(userIdNum)) {
        return NextResponse.json(
          { message: "Invalid user ID" },
          { status: 400 }
        );
      }

      if (userId !== userIdNum) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      const result = await db
        .select()
        .from(promotionRequests)
        .where(eq(promotionRequests.userId, userIdNum));

      return NextResponse.json(result, { status: 200 });
    } else {
      // Admin viewing all requests
      const adminAuth = await requireSuperadmin();
      if (adminAuth instanceof NextResponse) return adminAuth;

      const result = await db.select().from(promotionRequests);
      return NextResponse.json(result, { status: 200 });
    }
  } catch (error) {
    console.error("Error fetching promotion requests:", error);
    return NextResponse.json(
      { message: "Failed to get promotion requests" },
      { status: 500 }
    );
  }
}

// POST /api/promotion/requests
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const body = await req.json();
    const requestData = insertPromotionRequestSchema.parse({
      ...body,
      userId,
      requestedAt: new Date(),
      updatedAt: new Date(),
    });

    const insertRes = await db.insert(promotionRequests).values(requestData);
    const insertId = insertRes[0].insertId;
    const [newRequest] = await db
      .select()
      .from(promotionRequests)
      .where(eq(promotionRequests.id, insertId));

    // Notify admin
    const user = await storage.getUser(userId);
    if (user) {
      notificationService
        .notifyAdminPromotionRequest(user.id, user.username, newRequest.id)
        .catch((err: any) =>
          console.error("Failed to send promotion notification:", err)
        );
    }

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating promotion request:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create promotion request",
      },
      { status: 500 }
    );
  }
}
