import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// GET /api/admin/tools/urls
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const urls = await storage.getAllShortenedUrls();
    return NextResponse.json(urls, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch shortened URLs:", error);
    return NextResponse.json(
      { message: "Failed to fetch shortened URLs" },
      { status: 500 }
    );
  }
}
