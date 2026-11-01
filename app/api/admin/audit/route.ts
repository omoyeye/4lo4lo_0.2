import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { listAdminActions } from "@/lib/core/audit";

export const dynamic = "force-dynamic";

/** GET /api/admin/audit, the latest admin actions (superadmin only). */
export async function GET() {
  const admin = await requireSuperadmin();
  if (admin instanceof NextResponse) return admin;
  try {
    return NextResponse.json(await listAdminActions());
  } catch (err) {
    console.error("audit: list failed", err);
    return NextResponse.json({ message: "Failed to load the activity log" }, { status: 500 });
  }
}
