import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@shared/schema.mysql";
import { verifyUnsubscribeToken } from "@/lib/core/services/email-layout";

/**
 * Announcement opt-out. No sign-in needed: the signed token in the link is
 * the proof. Sets notificationPreferences.notifySystemAnnouncements = false,
 * the same switch as Settings → Notifications.
 *
 *   POST ?u=&t=   one-click unsubscribe from the mail client (RFC 8058)
 *   POST {u,t,resubscribe?} from the /unsubscribe page
 */
async function setAnnouncements(userId: number, enabled: boolean) {
  const [user] = await db.select({ prefs: users.notificationPreferences }).from(users).where(eq(users.id, userId));
  if (!user) return false;
  const prefs = { ...((user.prefs as Record<string, boolean> | null) ?? {}), notifySystemAnnouncements: enabled };
  await db.update(users).set({ notificationPreferences: prefs }).where(eq(users.id, userId));
  return true;
}

export async function POST(req: NextRequest) {
  const qs = req.nextUrl.searchParams;
  let u = qs.get("u");
  let t = qs.get("t");
  let resubscribe = false;
  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    u = body.u ?? u;
    t = body.t ?? t;
    resubscribe = body.resubscribe === true;
  }

  const userId = Number(u);
  if (!Number.isInteger(userId) || !t || !verifyUnsubscribeToken(userId, String(t))) {
    return NextResponse.json({ message: "This unsubscribe link isn't valid." }, { status: 400 });
  }

  try {
    const ok = await setAnnouncements(userId, resubscribe);
    if (!ok) return NextResponse.json({ message: "Account not found." }, { status: 404 });
    return NextResponse.json({ subscribed: resubscribe });
  } catch (err) {
    console.error("unsubscribe failed", err);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
