import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/admin/tools/qr-leads
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const leads = await storage.getQrEmailLeads();
    return NextResponse.json(leads, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch QR leads:", error);
    return NextResponse.json(
      { message: "Failed to fetch QR leads" },
      { status: 500 }
    );
  }
}
