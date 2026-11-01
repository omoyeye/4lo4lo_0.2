import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { DEVICE_ID_PATTERN, recordDevice } from "@/lib/core/devices";

/** POST /api/user/device  { deviceId, platform? }, sent once per session by web and app. */
export async function POST(req: NextRequest) {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  if (!DEVICE_ID_PATTERN.test(deviceId)) return NextResponse.json({ message: "Invalid device" }, { status: 400 });
  const platform = ["web", "ios", "android"].includes(body?.platform) ? body.platform : "web";

  try {
    const recorded = await recordDevice(req, userId, deviceId, platform);
    return NextResponse.json({ recorded });
  } catch (err) {
    console.error("device: record failed", err);
    return NextResponse.json({ recorded: false });
  }
}
