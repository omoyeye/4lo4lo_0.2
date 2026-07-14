import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";

// POST /api/admin/security/audit
export async function POST(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const auditId = Date.now().toString();
    return NextResponse.json(
      {
        message: "Audit initiated",
        auditId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to initiate audit:", error);
    return NextResponse.json(
      { message: "Failed to initiate audit" },
      { status: 500 }
    );
  }
}
