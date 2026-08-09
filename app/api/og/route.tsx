import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Dynamic Open Graph image.
 *
 * Every shared link, a profile, a tool page, the homepage, gets a branded
 * 1200x630 card instead of nothing. Link previews are a meaningful share-rate
 * multiplier and this is the cheapest way to get them everywhere at once.
 *
 * Edge runtime, so keep this dependency-free: no database, no fonts fetched
 * from a third party (the CSP on the deployment would block them anyway).
 */

const clamp = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const title = clamp(searchParams.get("title") || "4lo4lo", 90);
  const subtitle = clamp(searchParams.get("subtitle") || "", 140);
  const tag = searchParams.get("tag");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 45%, #db2777 100%)",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.18)",
              color: "white",
              fontSize: "26px",
              fontWeight: 700,
            }}
          >
            4
          </div>
          <div style={{ color: "white", fontSize: "30px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            4LO4LO
          </div>

          {tag ? (
            <div
              style={{
                display: "flex",
                marginLeft: "12px",
                padding: "8px 18px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.16)",
                color: "rgba(255,255,255,0.95)",
                fontSize: "20px",
                fontWeight: 600,
              }}
            >
              {clamp(tag, 32)}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              color: "white",
              fontSize: title.length > 55 ? "58px" : "70px",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                color: "rgba(255,255,255,0.82)",
                fontSize: "28px",
                lineHeight: 1.35,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", color: "rgba(255,255,255,0.75)", fontSize: "24px" }}>
          Free creator tools · Earn rewards · Grow together
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
