import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import {
  createListingCommentSchema,
  sellListingSchema,
} from "@shared/schema.mysql";

// Helper to enrich a listing
async function enrichListing(
  listing: NonNullable<Awaited<ReturnType<typeof storage.getListingById>>>
) {
  const [seller, buyer, comments] = await Promise.all([
    listing.sellerId ? storage.getUser(listing.sellerId) : null,
    listing.buyerId ? storage.getUser(listing.buyerId) : null,
    storage.getListingComments(listing.id),
  ]);
  return {
    ...listing,
    sellerUsername: seller?.username ?? null,
    buyerUsername: buyer?.username ?? null,
    comments: await Promise.all(
      comments.map(async (c) => {
        const commenter = await storage.getUser(c.userId);
        return { ...c, username: commenter?.username ?? "unknown" };
      })
    ),
  };
}

// GET /api/marketplace/listings/:id
export async function GET(
  _req: NextRequest,
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
    const enriched = await enrichListing(listing);
    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to fetch listing:", error);
    return NextResponse.json(
      { message: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}

// DELETE /api/marketplace/listings/:id
export async function DELETE(
  _req: NextRequest,
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
        { message: "You can only delete your own listings" },
        { status: 403 }
      );
    }
    if (listing.status !== "open") {
      return NextResponse.json(
        { message: "Only open listings can be deleted" },
        { status: 400 }
      );
    }

    const deleted = await storage.deleteListing(listingId);
    if (!deleted) {
      return NextResponse.json(
        { message: "Listing not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Listing deleted" });
  } catch (error) {
    console.error("Failed to delete listing:", error);
    return NextResponse.json(
      { message: "Failed to delete listing" },
      { status: 500 }
    );
  }
}
