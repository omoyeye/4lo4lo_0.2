import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { appSettings } from "@shared/schema.mysql";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  value: z.string(),
  description: z.string().optional(),
});

/**
 * Settings keys the admin panel is allowed to write.
 *
 * An allow-list rather than free-form keys: app_settings is read unauthenticated
 * by /api/settings and drives feature flags, so an arbitrary-key writer would
 * let one compromised admin session inject anything into global config.
 */
const WRITABLE_KEYS = new Set([
  "promote_me_enabled",
  "classroom_enabled",
  "leaderboard_enabled",
  "leaderboard_limit",
  "max_open_listings",
  "marketplace_enabled",
  "maintenance_mode",
  "referrals_enabled",
  "tasks_enabled",
  "signups_enabled",
  "min_payout_points",
  "points_per_referral",
]);

// GET /api/admin/settings/:key
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { key } = await params;
    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key));

    if (!setting) {
      return NextResponse.json({ key, value: null }, { status: 200 });
    }
    return NextResponse.json(setting, { status: 200 });
  } catch (error) {
    console.error("Failed to read setting:", error);
    return NextResponse.json(
      { message: "Failed to read setting" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings/:key
 *
 * Upsert — the row may not exist yet on an existing database, and creating it
 * is strictly additive, so this is safe against live data.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { key } = await params;

    if (!WRITABLE_KEYS.has(key)) {
      return NextResponse.json(
        { message: `Setting "${key}" is not writable from the admin panel` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { value, description } = bodySchema.parse(body);

    const [existing] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key));

    if (existing) {
      await db
        .update(appSettings)
        .set({ value, updatedAt: new Date(), updatedBy: auth.id })
        .where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({
        key,
        value,
        description: description ?? null,
        updatedAt: new Date(),
        updatedBy: auth.id,
      });
    }

    return NextResponse.json({ key, value }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to update setting:", error);
    return NextResponse.json(
      { message: "Failed to update setting" },
      { status: 500 }
    );
  }
}
