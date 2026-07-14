import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { insertReferralTierSchema } from "@shared/schema.mysql";

// PATCH /api/admin/referral-tiers/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const tierId = parseInt(id, 10);
    if (isNaN(tierId)) {
      return NextResponse.json(
        { message: "Invalid tier ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = insertReferralTierSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid data", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const tier = await storage.updateReferralTier(tierId, parsed.data);
    if (!tier) {
      return NextResponse.json(
        { message: "Referral tier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tier, { status: 200 });
  } catch (error) {
    console.error("Failed to update referral tier:", error);
    return NextResponse.json(
      { message: "Failed to update referral tier" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/referral-tiers/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const tierId = parseInt(id, 10);
    if (isNaN(tierId)) {
      return NextResponse.json(
        { message: "Invalid tier ID" },
        { status: 400 }
      );
    }

    const deleted = await storage.deleteReferralTier(tierId);
    if (!deleted) {
      return NextResponse.json(
        { message: "Referral tier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete referral tier:", error);
    return NextResponse.json(
      { message: "Failed to delete referral tier" },
      { status: 500 }
    );
  }
}
