import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

export const runtime = "nodejs";

/**
 * GET /api/share/card?kind=level|badge|streak
 *
 * A 1080x1080 image of the signed-in member's achievement, for sharing to
 * stories and chats. Drawn from their real account data (not query params),
 * so nobody can mint a card for a level they don't have.
 */
export async function GET(req: Request) {
  const userId = await requireAuth();
  if (userId instanceof NextResponse) return userId;

  const user = await storage.getUser(userId);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const kind = new URL(req.url).searchParams.get("kind") ?? "level";
  const badges = await storage.getUserBadges(userId).catch(() => []);
  const latestBadge = badges[badges.length - 1]?.badge;
  const name = user.displayName || user.username;

  const headline =
    kind === "badge" && latestBadge
      ? { eyebrow: "New badge unlocked", big: latestBadge.title, small: latestBadge.description ?? "" }
      : kind === "streak"
        ? { eyebrow: "Daily streak", big: `${user.streakCount} day${user.streakCount === 1 ? "" : "s"}`, small: "Showing up every day on 4LO4LO" }
        : { eyebrow: "Level up", big: `Level ${user.level}`, small: `${user.points.toLocaleString()} points earned` };

  const stats = [
    { label: "Level", value: String(user.level) },
    { label: "Points", value: user.points.toLocaleString() },
    { label: "Day streak", value: String(user.streakCount) },
    { label: "Badges", value: String(badges.length) },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(140deg, #3b0764 0%, #7c3aed 45%, #db2777 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "18px", background: "rgba(255,255,255,0.18)", fontSize: "30px", fontWeight: 800 }}>4</div>
          <div style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "-0.02em" }}>4LO4LO</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", alignSelf: "flex-start", padding: "10px 24px", borderRadius: "999px", background: "rgba(255,255,255,0.16)", fontSize: "28px", fontWeight: 600 }}>
            {headline.eyebrow}
          </div>
          <div style={{ fontSize: headline.big.length > 14 ? "96px" : "140px", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em" }}>{headline.big}</div>
          <div style={{ fontSize: "34px", color: "rgba(255,255,255,0.85)" }}>{headline.small.slice(0, 80)}</div>
          <div style={{ fontSize: "30px", color: "rgba(255,255,255,0.75)", marginTop: "8px" }}>@{user.username === name ? user.username : `${user.username} · ${name}`.slice(0, 40)}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ display: "flex", gap: "18px" }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", flex: 1, padding: "22px", borderRadius: "24px", background: "rgba(255,255,255,0.12)" }}>
                <div style={{ fontSize: "40px", fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: "22px", color: "rgba(255,255,255,0.75)" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "26px", color: "rgba(255,255,255,0.85)" }}>
            <span>Earn rewards for growing together</span>
            <span style={{ fontWeight: 700 }}>4lo4lo.site · code {user.referralCode}</span>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080, headers: { "Cache-Control": "private, no-store" } }
  );
}
