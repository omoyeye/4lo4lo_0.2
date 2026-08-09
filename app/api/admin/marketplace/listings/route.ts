import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/marketplace/listings
 *
 * Listings enriched with seller/buyer usernames and their comment threads —
 * the AdminListing shape the moderation panel renders.
 */
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const [listings, users] = await Promise.all([
      storage.getListings(),
      storage.getAllUsers(),
    ]);

    const byId = new Map(users.map((u) => [u.id, u]));

    const enriched = await Promise.all(
      listings.map(async (listing) => {
        const comments = await storage
          .getListingComments(listing.id)
          .catch(() => []);

        return {
          ...listing,
          sellerUsername: byId.get(listing.sellerId)?.username ?? "unknown",
          buyerUsername: listing.buyerId
            ? byId.get(listing.buyerId)?.username ?? "unknown"
            : null,
          comments: comments.map((c) => ({
            ...c,
            username: byId.get(c.userId)?.username ?? "unknown",
          })),
        };
      })
    );

    enriched.sort(
      (a, b) =>
        new Date(b.createdAt as any).getTime() -
        new Date(a.createdAt as any).getTime()
    );

    return NextResponse.json(enriched, { status: 200 });
  } catch (error) {
    console.error("Failed to list marketplace listings:", error);
    return NextResponse.json(
      { message: "Failed to list marketplace listings" },
      { status: 500 }
    );
  }
}
