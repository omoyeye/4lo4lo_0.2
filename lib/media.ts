import { randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { execute, isMissingTable, queryRows } from "@/lib/core/sql-utils";

/**
 * Member image uploads: profile photos and task-proof screenshots.
 *
 * Vercel Blob when BLOB_READ_WRITE_TOKEN is set (same as the admin email
 * uploader). Without it, images go into the media_uploads table
 * (scripts/sql/009) and are served by /api/media/:id. Both clients resize
 * before uploading, so database storage stays small.
 */

export type MediaKind = "avatar" | "proof";

export class UploadError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const LIMITS: Record<MediaKind, number> = {
  avatar: 1 * 1024 * 1024,
  proof: 3 * 1024 * 1024,
};

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Sniff the real type from the bytes; the browser-supplied type is not trusted. */
function sniff(bytes: Buffer): string | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Reads the "file" field of a multipart request into a validated image. */
export async function readImageField(form: FormData, kind: MediaKind): Promise<{ bytes: Buffer; mime: string }> {
  const file = form.get("file");
  if (!file || typeof file === "string") throw new UploadError("No image was attached", 400);
  if (file.size > LIMITS[kind]) {
    throw new UploadError(`Image is too large. The limit is ${LIMITS[kind] / 1024 / 1024} MB.`, 413);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime) throw new UploadError("Please upload a JPG, PNG or WebP image", 415);
  return { bytes, mime };
}

/** Stores an image and returns the URL to save. Private images are only served to their owner and admins. */
export async function saveImage(opts: {
  userId: number;
  kind: MediaKind;
  bytes: Buffer;
  mime: string;
  visibility: "public" | "private";
}): Promise<string> {
  const { userId, kind, bytes, mime, visibility } = opts;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const name = `${kind}s/${userId}-${Date.now()}-${randomBytes(6).toString("hex")}.${EXT[mime]}`;
    const blob = await put(name, bytes, { access: "public", contentType: mime, addRandomSuffix: true });
    return blob.url;
  }

  try {
    const result = await execute(
      sql`INSERT INTO media_uploads (user_id, kind, visibility, mime, data) VALUES (${userId}, ${kind}, ${visibility}, ${mime}, ${bytes})`
    );
    return `/api/media/${result.insertId}`;
  } catch (err) {
    if (isMissingTable(err)) {
      throw new UploadError("Uploads are not enabled yet. An admin needs to run scripts/sql/009.", 503);
    }
    throw err;
  }
}

export async function readMedia(id: number) {
  const rows = await queryRows<{ user_id: number; visibility: string; mime: string; data: Buffer }>(
    sql`SELECT user_id, visibility, mime, data FROM media_uploads WHERE id = ${id} LIMIT 1`
  );
  return rows[0] ?? null;
}

/** Removes a database-stored image when its owner replaces it. Blob URLs are left alone. */
export async function deleteStoredImage(url: string | null | undefined, userId: number): Promise<void> {
  const match = url?.match(/^\/api\/media\/(\d+)$/);
  if (!match) return;
  await execute(sql`DELETE FROM media_uploads WHERE id = ${Number(match[1])} AND user_id = ${userId}`).catch(() => {});
}
