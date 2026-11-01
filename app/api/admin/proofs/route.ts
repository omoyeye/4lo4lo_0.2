import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { listProofs } from "@/lib/core/proofs";
import { isMissingTable } from "@/lib/core/sql-utils";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["pending", "approved", "rejected", "all"]);

/** GET /api/admin/proofs?status=pending */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  if (!STATUSES.has(status)) return NextResponse.json({ message: "Invalid status" }, { status: 400 });

  try {
    return NextResponse.json({ enabled: true, proofs: await listProofs(status) });
  } catch (err) {
    if (isMissingTable(err)) return NextResponse.json({ enabled: false, proofs: [] });
    console.error("admin proofs: list failed", err);
    return NextResponse.json({ message: "Failed to load proofs" }, { status: 500 });
  }
}
