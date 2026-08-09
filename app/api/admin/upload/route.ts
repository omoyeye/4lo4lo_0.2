import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { randomBytes } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

/**
 * POST /api/admin/upload — image upload for the Email Center composer.
 *
 * ── Storage backend ─────────────────────────────────────────────────────────
 *
 * This project deploys to Vercel, where the filesystem is read-only apart from
 * /tmp, and /tmp does not survive between invocations and is not web-served.
 * Writing to public/uploads (what this route did before) fails outright with
 * EROFS in production, so admin image upload has never worked there.
 *
 * So: Vercel Blob when a token is present, local disk otherwise for local dev.
 * The @vercel/blob import is dynamic so the package is only loaded on the path
 * that actually uses it.
 *
 * To enable in production:
 *   1. Vercel dashboard → Storage → create a Blob store, connect this project.
 *   2. That sets BLOB_READ_WRITE_TOKEN automatically. Redeploy.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Allow-list by MIME *and* extension — an admin session should not be able to
// drop an executable or an .html file into a publicly served location.
const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          message: `File too large. Maximum size is ${MAX_BYTES / 1024 / 1024}MB.`,
        },
        { status: 413 }
      );
    }

    const ext = ALLOWED[file.type];
    if (!ext) {
      return NextResponse.json(
        {
          message: `Unsupported file type "${file.type}". Allowed: ${Object.keys(
            ALLOWED
          ).join(", ")}`,
        },
        { status: 415 }
      );
    }

    // Never derive the stored name from user input — no traversal, no collisions.
    const safeName = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    // ── Vercel Blob ─────────────────────────────────────────────────────────
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`email-assets/${safeName}`, bytes, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
      });

      return NextResponse.json(
        {
          url: blob.url,
          filename: file.name,
          size: file.size,
          type: file.type,
        },
        { status: 201 }
      );
    }

    // ── No blob store configured ────────────────────────────────────────────
    if (isServerless) {
      // Fail with an actionable message rather than an EROFS stack trace.
      return NextResponse.json(
        {
          message:
            "File storage is not configured. In the Vercel dashboard open Storage, create a Blob store and connect it to this project, then redeploy.",
          code: "BLOB_NOT_CONFIGURED",
        },
        { status: 501 }
      );
    }

    // ── Local development ───────────────────────────────────────────────────
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), bytes);

    return NextResponse.json(
      {
        url: `/uploads/${safeName}`,
        filename: file.name,
        size: file.size,
        type: file.type,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to upload file:", error);
    return NextResponse.json(
      { message: "Failed to upload file" },
      { status: 500 }
    );
  }
}
