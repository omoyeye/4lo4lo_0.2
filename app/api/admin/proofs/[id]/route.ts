import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/lib/core/audit";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { ProofError, reviewProof } from "@/lib/core/proofs";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional().nullable(),
});

/** PATCH /api/admin/proofs/:id  { action: "approve" | "reject", reason? } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const proofId = parseInt(id, 10);
  if (!Number.isFinite(proofId)) return NextResponse.json({ message: "Invalid proof ID" }, { status: 400 });

  try {
    const { action, reason } = bodySchema.parse(await req.json());
    const result = await reviewProof({ proofId, adminId: admin.id, action, reason });
    logAdminAction({
      adminId: admin.id,
      action: "proof.review",
      targetType: "proof",
      targetId: proofId,
      summary: `${action === "approve" ? "Approved" : "Rejected"} proof #${proofId} (${result.points} points, user #${result.user_id})${reason ? `: ${reason}` : ""}`,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ message: "Validation error", errors: err.errors }, { status: 400 });
    if (err instanceof ProofError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("admin proofs: review failed", err);
    return NextResponse.json({ message: "Failed to review proof" }, { status: 500 });
  }
}
