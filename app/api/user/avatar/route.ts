import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { users } from "@shared/schema.mysql";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { deleteStoredImage, readImageField, saveImage, UploadError } from "@/lib/media";
import { storage } from "@/lib/core/storage";

export const runtime = "nodejs";

/** POST /api/user/avatar  multipart: file. Sets the profile photo. */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  const limited = rateLimit(req, LIMITS.taskAction, `avatar:${userId}`);
  if (limited) return limited;

  try {
    const user = await storage.getUser(userId);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const image = await readImageField(await req.formData(), "avatar");
    const avatar = await saveImage({ userId, kind: "avatar", visibility: "public", ...image });
    await db.update(users).set({ avatar, updatedAt: new Date() }).where(eq(users.id, userId));
    await deleteStoredImage(user.avatar, userId);

    return NextResponse.json({ avatar });
  } catch (err) {
    if (err instanceof UploadError) return NextResponse.json({ message: err.message }, { status: err.status });
    console.error("avatar: upload failed", err);
    return NextResponse.json({ message: "Failed to upload photo" }, { status: 500 });
  }
}

/** DELETE /api/user/avatar, back to initials. */
export async function DELETE() {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  const user = await storage.getUser(userId);
  await db.update(users).set({ avatar: null, updatedAt: new Date() }).where(eq(users.id, userId));
  await deleteStoredImage(user?.avatar, userId);
  return NextResponse.json({ avatar: null });
}
