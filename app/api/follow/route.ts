import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/core/storage";
import { followUser, unfollowUser, getFollowCounts, isFollowing } from "@/lib/core/community";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

/**
 * POST   /api/follow  { username }  follow a user
 * DELETE /api/follow  { username }  unfollow
 *
 * Takes a username rather than an id so the client never has to resolve one,
 * and so a caller cannot enumerate the user table by incrementing an integer.
 */

const bodySchema = z.object({ username: z.string().min(1).max(255) });

async function resolve(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: "Sign in to follow creators" }, { status: 401 }) };
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return { error: NextResponse.json({ message: "username is required" }, { status: 400 }) };
  }

  const target = await storage.getUserByUsername(parsed.data.username).catch(() => undefined);
  if (!target) {
    return { error: NextResponse.json({ message: "User not found" }, { status: 404 }) };
  }

  // Respect the target's visibility choice. A private profile should not be
  // followable, or the follower count becomes a way to observe someone who
  // opted out of being observed.
  if (!target.isPublic) {
    return { error: NextResponse.json({ message: "This profile is private" }, { status: 403 }) };
  }

  return { viewerId: parseInt(session.user.id, 10), target };
}

/**
 * GET /api/follow?username=...
 *
 * Per-viewer follow state. Separate from the profile page because that page is
 * ISR-cached for search engines, and anything session-dependent baked into a
 * cached render would be served to the wrong person.
 */
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ message: "username is required" }, { status: 400 });
  }

  const session = await auth();
  const viewerId = session?.user?.id ? parseInt(session.user.id, 10) : null;

  const target = await storage.getUserByUsername(username).catch(() => undefined);
  if (!target) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const counts = await getFollowCounts(target.id);
  const isSelf = viewerId === target.id;
  const following =
    viewerId && !isSelf ? await isFollowing(viewerId, target.id) : false;

  return NextResponse.json(
    {
      following,
      isSelf,
      signedIn: Boolean(viewerId),
      followers: counts.followers,
      followingCount: counts.following,
    },
    { status: 200 }
  );
}

const NOT_ENABLED = {
  message:
    "Following is not enabled yet. An administrator needs to run scripts/sql/006-community-tables.sql.",
  code: "COMMUNITY_NOT_ENABLED",
};

export async function POST(req: NextRequest) {
  const resolved = await resolve(req);
  if ("error" in resolved) return resolved.error;

  const limited = rateLimit(req, LIMITS.taskAction, `follow:${resolved.viewerId}`);
  if (limited) return limited;

  const result = await followUser(resolved.viewerId, resolved.target.id);

  if (!result.ok) {
    if (result.reason === "not_enabled") return NextResponse.json(NOT_ENABLED, { status: 503 });
    if (result.reason === "self") {
      return NextResponse.json({ message: "You cannot follow yourself" }, { status: 400 });
    }
    return NextResponse.json({ message: "Could not follow" }, { status: 500 });
  }

  const counts = await getFollowCounts(resolved.target.id);
  // Do not spread `counts` here. It carries its own `following` key, which is
  // a COUNT of who that user follows, and it would silently overwrite the
  // `following` boolean the client reads to set the button state.
  return NextResponse.json(
    { following: true, followers: counts.followers, followingCount: counts.following },
    { status: 200 }
  );
}

export async function DELETE(req: NextRequest) {
  const resolved = await resolve(req);
  if ("error" in resolved) return resolved.error;

  const limited = rateLimit(req, LIMITS.taskAction, `follow:${resolved.viewerId}`);
  if (limited) return limited;

  const result = await unfollowUser(resolved.viewerId, resolved.target.id);

  if (!result.ok) {
    if (result.reason === "not_enabled") return NextResponse.json(NOT_ENABLED, { status: 503 });
    return NextResponse.json({ message: "Could not unfollow" }, { status: 500 });
  }

  const counts = await getFollowCounts(resolved.target.id);
  return NextResponse.json(
    { following: false, followers: counts.followers, followingCount: counts.following },
    { status: 200 }
  );
}
