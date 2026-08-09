import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";
import { auth } from "@/auth";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";
import { nanoid } from "nanoid";

/** Hosts that must never be wrapped, SSRF and internal-network probing. */
function isDisallowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h.endsWith(".localhost") ||
    h.endsWith(".internal") ||
    h.endsWith(".local") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h) || // link-local / cloud metadata
    h === "[::1]"
  );
}

/**
 * POST /api/tools/shorten
 *
 * Stays open to anonymous callers because /free-tools is a public lead-gen
 * page. The abuse vector (an unlimited anonymous redirector on your own domain,
 * which is how legitimate sites land on phishing blocklists) is closed by the
 * per-IP rate limit plus the destination blocklist above, rather than by
 * putting the public feature behind a login.
 *
 * Signed-in users get the higher per-account budget.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    const limited = session?.user?.id
      ? rateLimit(req, LIMITS.publicTool, `user:${session.user.id}`)
      : rateLimit(req, { ...LIMITS.publicTool, name: "shorten-anon", limit: 5 });
    if (limited) return limited;

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

    if (isDisallowedHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { message: "That destination is not allowed" },
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
