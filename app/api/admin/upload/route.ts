import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { randomBytes } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

/**
 * POST /api/admin/upload — image upload for the Email Center composer.
 *
 * DEPLOYMENT NOTE: writes to public/uploads on the server's local disk. That
 * works under `next start` on a persistent host (VPS, container with a volume),
 * which is what this app's pooled MySQL connection implies. On a serverless
 * platform the filesystem is ephemeral and uploads will vanish between
 * invocations — move to S3/R2/Cloudinary before deploying there. See README.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Allow-list by MIME *and* extension — an admin session should not be able to
// drop an executable or an .html file into a publicly served directory.
const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

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
        { message: `File too large. Maximum size is ${MAX_BYTES / 1024 / 1024}MB.` },
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
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
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
