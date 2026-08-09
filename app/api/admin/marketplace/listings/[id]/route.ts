import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

/**
 * DELETE /api/admin/marketplace/listings/:id — moderation removal.
 *
 * Refuses to remove a listing that has already been sold: the sale moved
 * points between two users, and deleting the record would destroy the only
 * audit trail of that transfer.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

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

    if (listing.status === "sold") {
      return NextResponse.json(
        {
          message:
            "Sold listings cannot be deleted — they are the record of a points transfer.",
        },
        { status: 409 }
      );
    }

    const deleted = await storage.deleteListing(listingId);
    if (!deleted) {
      return NextResponse.json(
        { message: "Failed to delete listing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete listing:", error);
    return NextResponse.json(
      { message: "Failed to delete listing" },
      { status: 500 }
    );
  }
}
