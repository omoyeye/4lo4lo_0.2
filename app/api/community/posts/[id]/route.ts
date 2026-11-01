import { NextRequest, NextResponse } from "next/server";
import { deletePost } from "@/lib/core/posts";
import { idParam, member, postErrorResponse } from "../../_shared";

/** DELETE /api/community/posts/:id, own post (or any, for admins). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await member();
  if (m instanceof NextResponse) return m;
  const id = idParam((await params).id);
  if (!id) return NextResponse.json({ message: "Post not found" }, { status: 404 });
  try {
    await deletePost(id, m.user.id, m.isAdmin);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return postErrorResponse(err, "delete the post");
  }
}
