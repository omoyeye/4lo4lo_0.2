import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { toggleLike } from "@/lib/core/posts";
import { idParam, member, postErrorResponse } from "../../../_shared";

/** POST /api/community/posts/:id/like, toggles your like. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await member();
  if (m instanceof NextResponse) return m;
  const limited = rateLimit(req, { name: "community-like", limit: 60, windowMs: 60_000 }, `user:${m.user.id}`);
  if (limited) return limited;
  const id = idParam((await params).id);
  if (!id) return NextResponse.json({ message: "Post not found" }, { status: 404 });
  try {
    return NextResponse.json(await toggleLike(id, m.user.id));
  } catch (err) {
    return postErrorResponse(err, "like the post");
  }
}
