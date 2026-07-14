import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertReferralTierSchema } from "@shared/schema.mysql";
import { z } from "zod";

// GET /api/admin/referral-tiers
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const tiers = await storage.getReferralTiers();
    return NextResponse.json(tiers, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch referral tiers:", error);
    return NextResponse.json(
      { message: "Failed to fetch referral tiers" },
      { status: 500 }
    );
  }
}

// POST /api/admin/referral-tiers
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const body = await req.json();
    const parsed = insertReferralTierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid data", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const tier = await storage.createReferralTier(parsed.data);
    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    console.error("Failed to create referral tier:", error);
    return NextResponse.json(
      { message: "Failed to create referral tier" },
      { status: 500 }
    );
  }
}
