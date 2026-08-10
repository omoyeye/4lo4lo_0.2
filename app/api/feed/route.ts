import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActivityFeed } from "@/lib/core/community";

export const dynamic = "force-dynamic";

/**
 * GET /api/feed
 *
 * Open to signed-out visitors on purpose: with no session it returns
 * platform-wide public activity, which is social proof on a page a stranger
 * can land on. Signed-in users with follows get their own feed.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const viewerId = session?.user?.id ? parseInt(session.user.id, 10) : null;

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(
      Math.max(parseInt(limitParam ?? "40", 10) || 40, 1),
      100
    );

    const feed = await getActivityFeed(
      Number.isFinite(viewerId as number) ? viewerId : null,
      limit
    );

    return NextResponse.json(feed, { status: 200 });
  } catch (error) {
    console.error("Failed to build feed:", error);
    return NextResponse.json(
      { events: [], personalised: false, communityEnabled: false },
      { status: 200 }
    );
  }
}
