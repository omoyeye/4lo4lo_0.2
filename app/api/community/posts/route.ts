import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { isMissingTable } from "@/lib/core/sql-utils";
import { createPost, listPosts } from "@/lib/core/posts";
import { member, postErrorResponse } from "../_shared";

export const dynamic = "force-dynamic";

/** GET /api/community/posts?before=<id>, newest posts (members only). */
export async function GET(req: NextRequest) {
  const m = await member();
  if (m instanceof NextResponse) return m;
  const before = parseInt(req.nextUrl.searchParams.get("before") ?? "", 10);
  try {
    return NextResponse.json({ enabled: true, ...(await listPosts(m.user.id, Number.isFinite(before) ? before : null)) });
  } catch (err) {
    if (isMissingTable(err)) return NextResponse.json({ enabled: false, posts: [], nextCursor: null });
    return postErrorResponse(err, "load posts");
  }
}

/** POST /api/community/posts { body }, up to 250 words. */
export async function POST(req: NextRequest) {
  const m = await member();
  if (m instanceof NextResponse) return m;
  // A post every 30 seconds is plenty for a person and slows down spam.
  const limited = rateLimit(req, { name: "community-post", limit: 1, windowMs: 30_000 }, `user:${m.user.id}`);
  if (limited) return limited;
  try {
    const { body } = await req.json().catch(() => ({}));
    const id = await createPost(m.user.id, body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return postErrorResponse(err, "publish your post");
  }
}
