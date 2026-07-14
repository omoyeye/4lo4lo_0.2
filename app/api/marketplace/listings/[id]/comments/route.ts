import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { createListingCommentSchema } from "@shared/schema.mysql";

// POST /api/marketplace/listings/:id/comments
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
    if (listing.status === "sold") {
      return NextResponse.json(
        { message: "Cannot comment on a sold listing" },
        { status: 400 }
      );
    }
    if (listing.sellerId === userId) {
      return NextResponse.json(
        { message: "You cannot comment on your own listing" },
        { status: 400 }
      );
    }

    // Enforce one comment per user per listing
    const existingComments = await storage.getListingComments(listingId);
    const alreadyCommented = existingComments.some((c) => c.userId === userId);
    if (alreadyCommented) {
      return NextResponse.json(
        { message: "You have already expressed interest in this listing" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const parsed = createListingCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const comment = await storage.createListingComment({
      listingId,
      userId,
      message: parsed.data.message,
    });
    const commenter = await storage.getUser(userId);
    return NextResponse.json(
      { ...comment, username: commenter?.username ?? "unknown" },
      { status: 201 }
    );
  } catch (error: any) {
    if (
      error?.code === "23505" ||
      (error?.message && error.message.includes("unique_user_comment"))
    ) {
      return NextResponse.json(
        { message: "You have already expressed interest in this listing" },
        { status: 409 }
      );
    }
    console.error("Failed to add comment:", error);
    return NextResponse.json(
      { message: "Failed to add comment" },
      { status: 500 }
    );
  }
}
