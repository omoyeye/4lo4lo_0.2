import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { readImageField, saveImage, UploadError } from "@/lib/media";
import { myProofs, ProofError, submitProof } from "@/lib/core/proofs";
import { isMissingTable } from "@/lib/core/sql-utils";
import { storage } from "@/lib/core/storage";

export const runtime = "nodejs";

/** GET /api/tasks/proof, the signed-in member's submitted proofs. */
export async function GET() {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;
  try {
    return NextResponse.json(await myProofs(userId));
  } catch (err) {
    if (isMissingTable(err)) return NextResponse.json([]);
    console.error("proofs: list failed", err);
    return NextResponse.json({ message: "Failed to load proofs" }, { status: 500 });
  }
}

/**
 * POST /api/tasks/proof  multipart: taskId, file (image), note?
 * Records the completion as "in review"; points are paid when an admin approves.
 */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  const limited = rateLimit(req, LIMITS.taskAction, `user:${userId}`);
  if (limited) return limited;

  try {
    const user = await storage.getUser(userId);
    if (!user || user.role === "deleted") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const taskId = parseInt(String(form.get("taskId") ?? ""), 10);
    if (!Number.isFinite(taskId)) return NextResponse.json({ message: "Missing task" }, { status: 400 });

    const completed = await storage.getCompletedTaskIds(userId);
    if (completed.includes(taskId)) {
      return NextResponse.json({ message: "You have already completed this task" }, { status: 409 });
    }

    const image = await readImageField(form, "proof");
    const imageUrl = await saveImage({ userId, kind: "proof", visibility: "private", ...image });
    const note = typeof form.get("note") === "string" ? (form.get("note") as string) : null;

    const result = await submitProof({ userId, taskId, imageUrl, note });
    return NextResponse.json({ ...result, status: "pending", message: "Proof submitted. Points are added once it's approved." }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError || err instanceof ProofError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    if (isMissingTable(err)) {
      return NextResponse.json({ message: "Proof uploads are not enabled yet." }, { status: 503 });
    }
    console.error("proofs: submit failed", err);
    return NextResponse.json({ message: "Failed to submit proof" }, { status: 500 });
  }
}
