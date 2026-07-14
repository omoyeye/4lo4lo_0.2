import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { sellListingSchema } from "@shared/schema.mysql";

// POST /api/marketplace/listings/:id/sell
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const { id } = await params;
    const listingId = parseInt(id, 10);
    if (isNaN(listingId)) {
      return NextResponse.json(
        { message: "Invalid listing ID" },
        { status: 400 }
      );
    }

    const listing = await storage.getListingById(listingId);
    if (!listing) {
      return NextResponse.json(
        { message: "Listing not found" },
        { status: 404 }
      );
    }
    if (listing.sellerId !== userId) {
      return NextResponse.json(
        { message: "Only the seller can mark a listing as sold" },
        { status: 403 }
      );
    }
    if (listing.status === "sold") {
      return NextResponse.json(
        { message: "Listing is already sold" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = sellListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const comment = await storage.getListingComment(parsed.data.buyerCommentId);
    if (!comment || comment.listingId !== listingId) {
      return NextResponse.json(
        { message: "Invalid buyer comment" },
        { status: 400 }
      );
    }

    const updatedListing = await storage.sellListing(listingId, comment.userId);

    // Notify buyer and seller
    const seller = await storage.getUser(userId);
    const buyer = await storage.getUser(comment.userId);
    if (buyer && seller) {
      await Promise.all([
        storage.createNotification({
          userId: buyer.id,
          adminOnly: false,
          type: "payout_processed",
          title: "Points Received via Marketplace",
          message: `You received ${listing.pointsAmount} points from @${seller.username} via the marketplace.`,
          isRead: false,
        }),
        storage.createNotification({
          userId: seller.id,
          adminOnly: false,
          type: "system_announcement",
          title: "Listing Sold",
          message: `You sold ${listing.pointsAmount} points to @${buyer.username}.`,
          isRead: false,
        }),
      ]);
    }

    return NextResponse.json(updatedListing);
  } catch (error) {
    console.error("Failed to complete sale:", error);
    return NextResponse.json(
      { message: "Failed to complete sale" },
      { status: 500 }
    );
  }
}
