import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { promotionRequests } from "@shared/schema.mysql";
import { storage } from "@/lib/core/storage";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/promotion-request/:id
 *
 * Single promotion request with the requesting user attached, powers the
 * "View details" dialog in the admin panel.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json(
        { message: "Invalid request ID" },
        { status: 400 }
      );
    }

    const [request] = await db
      .select()
      .from(promotionRequests)
      .where(eq(promotionRequests.id, requestId));

    if (!request) {
      return NextResponse.json(
        { message: "Promotion request not found" },
        { status: 404 }
      );
    }

    const user = await storage.getUser(request.userId).catch(() => undefined);

    return NextResponse.json(
      {
        ...request,
        user: user
          ? {
              id: user.id,
              username: user.username,
              email: user.email,
              displayName: user.displayName,
              points: user.points,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch promotion request:", error);
    return NextResponse.json(
      { message: "Failed to fetch promotion request" },
      { status: 500 }
    );
  }
}
