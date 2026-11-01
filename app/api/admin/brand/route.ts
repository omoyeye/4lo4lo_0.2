import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, requireSuperadmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { appSettings } from "@shared/schema.mysql";
import { BRAND_SETTING_KEY, SOCIAL_PLATFORMS, parseBrand } from "@/lib/brand-defaults";
import { clearBrandCache, getBrand } from "@/lib/brand";
import { logAdminAction } from "@/lib/core/audit";

export const dynamic = "force-dynamic";

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), "Must be a full link starting with https://");

const brandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(60),
  legalName: z.string().trim().min(1, "Legal name is required").max(120),
  tagline: z.string().trim().max(160),
  supportEmail: z.string().trim().email("Enter a valid support email"),
  postalAddress: z.string().trim().max(300),
  logoUrl: httpsUrl,
  socials: z.object(Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.key, httpsUrl.optional()])) as Record<string, z.ZodOptional<typeof httpsUrl>>),
});

/** GET /api/admin/brand, the current brand profile. */
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  clearBrandCache();
  return NextResponse.json(await getBrand());
}

/**
 * PUT /api/admin/brand, save the brand profile (superadmin). Used by email
 * headers/footers, website and app footers, and the legal pages.
 */
export async function PUT(req: NextRequest) {
  const admin = await requireSuperadmin();
  if (admin instanceof NextResponse) return admin;

  try {
    const data = brandSchema.parse(await req.json());
    const socials = Object.fromEntries(Object.entries(data.socials).filter(([, v]) => v));
    const value = JSON.stringify({ ...data, socials });

    const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, BRAND_SETTING_KEY));
    if (existing) {
      await db.update(appSettings).set({ value, updatedAt: new Date(), updatedBy: admin.id }).where(eq(appSettings.key, BRAND_SETTING_KEY));
    } else {
      await db.insert(appSettings).values({ key: BRAND_SETTING_KEY, value, description: "Brand name, legal details, logo and social links", updatedBy: admin.id });
    }
    clearBrandCache();

    logAdminAction({
      adminId: admin.id,
      action: "setting.update",
      targetType: "setting",
      summary: `Updated the brand profile (${data.name}, ${Object.keys(socials).length} social links)`,
    });

    return NextResponse.json(parseBrand(value));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ message: err.errors[0]?.message ?? "Check the form", errors: err.errors }, { status: 400 });
    }
    console.error("brand: save failed", err);
    return NextResponse.json({ message: "Failed to save brand settings" }, { status: 500 });
  }
}
