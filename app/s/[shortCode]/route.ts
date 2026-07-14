import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";

// GET /s/:shortCode — short-link redirect
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    const record = await storage.getShortenedUrl(shortCode);
    if (!record) {
      return new NextResponse("Short link not found", { status: 404 });
    }
    storage
      .incrementShortenedUrlClicks(shortCode)
      .catch((err) =>
        console.error(
          `[analytics] Failed to increment clicks for short code "${shortCode}":`,
          err
        )
      );
    return NextResponse.redirect(record.originalUrl, 302);
  } catch (error) {
    console.error("Short link error:", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
