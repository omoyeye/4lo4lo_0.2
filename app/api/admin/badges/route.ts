import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertBadgeSchema } from "@shared/schema.mysql";
import { z } from "zod";

// GET /api/admin/badges
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const badges = await storage.getAllBadges();
    return NextResponse.json(badges, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch badges:", error);
    return NextResponse.json(
      { message: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}

// POST /api/admin/badges
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const body = await req.json();
    const parsed = insertBadgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const badge = await storage.createBadge(parsed.data);
    return NextResponse.json(badge, { status: 201 });
  } catch (error) {
    console.error("Failed to create badge:", error);
    return NextResponse.json(
      { message: "Failed to create badge" },
      { status: 500 }
    );
  }
}
