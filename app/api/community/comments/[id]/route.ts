import { NextRequest, NextResponse } from "next/server";
import { deleteComment } from "@/lib/core/posts";
import { idParam, member, postErrorResponse } from "../../_shared";

/** DELETE /api/community/comments/:id, own comment (or any, for admins). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await member();
  if (m instanceof NextResponse) return m;
  const id = idParam((await params).id);
  if (!id) return NextResponse.json({ message: "Comment not found" }, { status: 404 });
  try {
    await deleteComment(id, m.user.id, m.isAdmin);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return postErrorResponse(err, "delete the comment");
  }
}
