import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { deletePushToken, isMissingTableError, PUSH_TOKEN_PATTERN, savePushToken } from "@/lib/push";

const NOT_ENABLED = {
  message: "Push notifications are not enabled yet. An administrator needs to run scripts/sql/008-mobile-push-tokens.sql.",
  code: "PUSH_NOT_ENABLED",
};

async function readToken(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const platform = body?.platform === "ios" || body?.platform === "android" ? body.platform : null;
  return { token, platform };
}

/** POST /api/mobile/push-token  { token, platform }  register this device for push. */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  const { token, platform } = await readToken(req);
  if (!PUSH_TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ message: "Invalid push token" }, { status: 400 });
  }

  try {
    await savePushToken(userId, token, platform);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (isMissingTableError(err)) return NextResponse.json(NOT_ENABLED, { status: 503 });
    console.error("push-token: save failed", err);
    return NextResponse.json({ message: "Could not register device" }, { status: 500 });
  }
}

/** DELETE /api/mobile/push-token  { token }  stop pushing to this device (sign out). */
export async function DELETE(req: NextRequest) {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  const { token } = await readToken(req);
  if (!token) return NextResponse.json({ message: "token is required" }, { status: 400 });

  try {
    await deletePushToken(userId, token);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (isMissingTableError(err)) return NextResponse.json({ ok: true }, { status: 200 });
    console.error("push-token: delete failed", err);
    return NextResponse.json({ message: "Could not unregister device" }, { status: 500 });
  }
}
