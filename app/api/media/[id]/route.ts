import { NextRequest, NextResponse } from "next/server";
import { auth, hasAdminAccess } from "@/auth";
import { readMedia } from "@/lib/media";
import { isMissingTable } from "@/lib/core/sql-utils";

export const runtime = "nodejs";

/**
 * GET /api/media/:id, an image stored in media_uploads.
 *
 * Profile photos are public and cached hard (a new photo gets a new id).
 * Proof screenshots are private: only the member who uploaded it and admins.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mediaId = parseInt(id, 10);
  if (!Number.isFinite(mediaId)) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const media = await readMedia(mediaId);
    if (!media) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (media.visibility !== "public") {
      const session = await auth();
      const viewer = session?.user?.id ? parseInt(session.user.id, 10) : null;
      if (!viewer || (viewer !== media.user_id && !hasAdminAccess(session?.user))) {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
      }
    }

    return new NextResponse(new Uint8Array(media.data), {
      status: 200,
      headers: {
        "Content-Type": media.mime,
        "Cache-Control": media.visibility === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (isMissingTable(err)) return NextResponse.json({ message: "Not found" }, { status: 404 });
    console.error("media: read failed", err);
    return NextResponse.json({ message: "Failed to load image" }, { status: 500 });
  }
}
