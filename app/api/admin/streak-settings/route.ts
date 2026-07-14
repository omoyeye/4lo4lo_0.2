import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { z } from "zod";

// GET /api/admin/streak-settings
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const settings = await storage.getStreakSettings();
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch streak settings:", error);
    return NextResponse.json(
      { message: "Failed to fetch streak settings" },
      { status: 500 }
    );
  }
}

// POST /api/admin/streak-settings
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const body = await req.json();
    const schema = z.object({
      milestones: z.array(
        z.object({
          streak: z.number().int().positive(),
          bonusPoints: z.number().int().min(0),
        })
      ),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    await storage.saveStreakSettings(parsed.data);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to save streak settings:", error);
    return NextResponse.json(
      { message: "Failed to save streak settings" },
      { status: 500 }
    );
  }
}
