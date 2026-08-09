import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/status
 *
 * Reports whether the current session may use the admin panel.
 * Consumed by <AdminProtectedRoute> and by middleware-adjacent client checks.
 *
 * Always returns 200 so the client can branch on the payload instead of
 * having to distinguish "not an admin" from "endpoint is broken" — the
 * previous behaviour (this route not existing) made every admin page
 * redirect to /admin/login forever.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { isAdmin: false, role: null, authenticated: false },
      { status: 200 }
    );
  }

  const role = session.user.role ?? "member";
  const isAdmin = role === "admin" || role === "superadmin";

  return NextResponse.json(
    {
      authenticated: true,
      isAdmin,
      role,
      id: parseInt(session.user.id, 10),
      username: session.user.name ?? null,
      email: session.user.email ?? null,
    },
    { status: 200 }
  );
}
