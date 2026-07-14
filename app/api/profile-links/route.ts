import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertProfileLinkSchema } from "@shared/schema.mysql";

// GET /api/profile-links
export async function GET(_req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const links = await storage.getUserProfileLinks(userId);
    return NextResponse.json(links);
  } catch (error) {
    console.error("Failed to fetch profile links:", error);
    return NextResponse.json(
      { message: "Failed to fetch profile links" },
      { status: 500 }
    );
  }
}

// POST /api/profile-links
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    if (userId instanceof NextResponse) return userId;

    const body = await req.json();
    const parsed = insertProfileLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const link = await storage.createProfileLink(userId, parsed.data);
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Failed to create profile link:", error);
    return NextResponse.json(
      { message: "Failed to create profile link" },
      { status: 500 }
    );
  }
}
