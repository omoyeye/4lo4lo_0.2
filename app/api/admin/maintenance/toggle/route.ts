import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { appSettings } from "@shared/schema.mysql";

/**
 * POST /api/admin/maintenance/toggle
 *
 * Flips the maintenance_mode app setting. (This used to return a random
 * boolean without storing anything.) The admin panel now writes the setting
 * directly through /api/admin/settings/maintenance_mode; this route stays for
 * anything still calling it.
 */
export async function POST(_req: NextRequest) {
  try {
    const adminAuth = await requireSuperadmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const [current] = await db.select().from(appSettings).where(eq(appSettings.key, "maintenance_mode"));
    const isEnabled = current?.value !== "true";

    if (current) {
      await db.update(appSettings).set({ value: String(isEnabled), updatedAt: new Date() }).where(eq(appSettings.key, "maintenance_mode"));
    } else {
      await db.insert(appSettings).values({ key: "maintenance_mode", value: String(isEnabled), description: "Show members a maintenance screen" });
    }

    return NextResponse.json({ isEnabled }, { status: 200 });
  } catch (error) {
    console.error("Failed to toggle maintenance mode:", error);
    return NextResponse.json({ message: "Failed to toggle maintenance mode" }, { status: 500 });
  }
}
