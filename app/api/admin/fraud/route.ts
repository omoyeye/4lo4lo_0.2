import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { fraudReport } from "@/lib/core/devices";

export const dynamic = "force-dynamic";

/** GET /api/admin/fraud, accounts sharing a device or a network. */
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  try {
    return NextResponse.json(await fraudReport());
  } catch (err) {
    console.error("admin fraud: report failed", err);
    return NextResponse.json({ message: "Failed to load flags" }, { status: 500 });
  }
}
