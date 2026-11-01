import { NextResponse } from "next/server";
import { auth, hasAdminAccess } from "@/auth";

/**
 * Get the current authenticated user session in a Next.js API Route.
 * Returns the session or null if unauthenticated.
 */
export async function getSession() {
  return await auth();
}

/**
 * Get current user id from session. Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return parseInt(session.user.id as string, 10);
}

/**
 * Require authentication. Returns a 401 response if not authenticated.
 * Usage: const userId = await requireAuth(); if (userId instanceof NextResponse) return userId;
 */
export async function requireAuth(): Promise<number | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return parseInt(session.user.id as string, 10);
}

/**
 * Require admin role. Returns a 403 response if not an admin.
 */
export async function requireAdmin(): Promise<
  { id: number; isAdmin: boolean } | NextResponse
> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!hasAdminAccess(session.user)) {
    return NextResponse.json(
      { message: "Admin access needs the emailed sign-in code. Sign in at /admin/login.", code: "ADMIN_CODE_REQUIRED" },
      { status: 403 }
    );
  }
  return {
    id: parseInt(session.user.id as string, 10),
    isAdmin: true,
  };
}

/**
 * Require superadmin role. Returns a 403 response if not a superadmin.
 */
export async function requireSuperadmin(): Promise<
  { id: number; isSuperadmin: boolean } | NextResponse
> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "superadmin" || !hasAdminAccess(session.user)) {
    return NextResponse.json({ message: "Superadmin access required" }, { status: 403 });
  }
  return {
    id: parseInt(session.user.id as string, 10),
    isSuperadmin: true,
  };
}
