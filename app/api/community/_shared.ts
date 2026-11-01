import { NextResponse } from "next/server";
import { auth, hasAdminAccess } from "@/auth";
import { storage } from "@/lib/core/storage";
import { isMissingTable } from "@/lib/core/sql-utils";
import { PostError } from "@/lib/core/posts";

/** Signed-in, non-deleted member, or a 401 response. */
export async function member() {
  const session = await auth();
  const id = session?.user?.id ? parseInt(session.user.id, 10) : NaN;
  if (!Number.isFinite(id)) return NextResponse.json({ message: "Sign in to use the community" }, { status: 401 });
  const user = await storage.getUser(id);
  if (!user || user.role === "deleted") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return { user, isAdmin: hasAdminAccess(session?.user) };
}

export function postErrorResponse(err: unknown, what: string) {
  if (err instanceof PostError) return NextResponse.json({ message: err.message }, { status: err.status });
  if (isMissingTable(err)) return NextResponse.json({ message: "Community posts aren't switched on yet.", enabled: false }, { status: 503 });
  console.error(`community: ${what} failed`, err);
  return NextResponse.json({ message: `Couldn't ${what}. Please try again.` }, { status: 500 });
}

export function idParam(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
