import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { db } from "@/lib/db";
import { appSettings } from "@shared/schema.mysql";
import { eq } from "drizzle-orm";
import { createListingSchema } from "@shared/schema.mysql";

// Helper to enrich a listing with seller/buyer usernames
async function enrichListing(listing: Awaited<ReturnType<typeof storage.getListingById>>) {
  if (!listing) return listing;
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

// GET /api/marketplace/listings
export async function GET(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const listings = await storage.getListings();
    const enriched = await Promise.all(listings.map(enrichListing));
    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to fetch listings:", error);
    return NextResponse.json(
      { message: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

// POST /api/marketplace/listings
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const body = await req.json();
    const parsed = createListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }
    const { pointsAmount, note } = parsed.data;

    const user = await storage.getUser(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    if (user.points < pointsAmount) {
      return NextResponse.json(
        { message: "Insufficient points balance" },
        { status: 400 }
      );
    }

    const openListings = await storage.getOpenListingsBySeller(userId);
    const [maxOpenSetting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "max_open_listings"));
    const parsedCap = maxOpenSetting ? parseInt(maxOpenSetting.value, 10) : NaN;
    const maxOpenListings =
      !isNaN(parsedCap) && parsedCap >= 1 ? Math.min(parsedCap, 50) : 3;

    if (openListings.length >= maxOpenListings) {
      return NextResponse.json(
        {
          message: `You have reached the maximum of ${maxOpenListings} open listings. Please sell or remove an existing listing before creating a new one.`,
        },
        { status: 400 }
      );
    }

    const listing = await storage.createListing({
      sellerId: userId,
      pointsAmount,
      note: note ?? null,
      status: "open",
      buyerId: null,
    });
    const enriched = await enrichListing(listing);
    return NextResponse.json(enriched, { status: 201 });
  } catch (error) {
    console.error("Failed to create listing:", error);
    return NextResponse.json(
      { message: "Failed to create listing" },
      { status: 500 }
    );
  }
}
