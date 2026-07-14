import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";
import { z } from "zod";
import { nanoid } from "nanoid";

// POST /api/tools/shorten
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalUrl } = body;

    if (!originalUrl || typeof originalUrl !== "string") {
      return NextResponse.json(
        { message: "originalUrl is required" },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(originalUrl);
    } catch {
      return NextResponse.json(
        { message: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { message: "Only http and https URLs are allowed" },
        { status: 400 }
      );
    }

    let shortened;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const shortCode = nanoid(6);
        shortened = await storage.createShortenedUrl(originalUrl, shortCode);
        break;
      } catch (colErr: unknown) {
        const msg = colErr instanceof Error ? colErr.message : "";
        if (attempt === 4 || !msg.includes("unique")) throw colErr;
      }
    }

    if (!shortened) {
      return NextResponse.json(
        { message: "Could not generate a unique short code" },
        { status: 500 }
      );
    }

    const host = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.json({
      shortUrl: `${host}/s/${shortened.shortCode}`,
    });
  } catch (error) {
    console.error("Failed to shorten URL:", error);
    return NextResponse.json(
      { message: "Failed to shorten URL" },
      { status: 500 }
    );
  }
}
