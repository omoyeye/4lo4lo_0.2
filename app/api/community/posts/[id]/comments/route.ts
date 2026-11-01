import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { addComment, listComments } from "@/lib/core/posts";
import { idParam, member, postErrorResponse } from "../../../_shared";

/** GET /api/community/posts/:id/comments */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await member();
  if (m instanceof NextResponse) return m;
  const id = idParam((await params).id);
  if (!id) return NextResponse.json({ message: "Post not found" }, { status: 404 });
  try {
    return NextResponse.json(await listComments(id));
  } catch (err) {
    return postErrorResponse(err, "load comments");
  }
}

/** POST /api/community/posts/:id/comments { body }, up to 100 words. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await member();
  if (m instanceof NextResponse) return m;
  const limited = rateLimit(req, { name: "community-comment", limit: 6, windowMs: 60_000 }, `user:${m.user.id}`);
  if (limited) return limited;
  const id = idParam((await params).id);
  if (!id) return NextResponse.json({ message: "Post not found" }, { status: 404 });
  try {
    const { body } = await req.json().catch(() => ({}));
    const commentId = await addComment(id, m.user.id, m.user.username, body);
    return NextResponse.json({ id: commentId }, { status: 201 });
  } catch (err) {
    return postErrorResponse(err, "post your comment");
  }
}
