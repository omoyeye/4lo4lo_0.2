import { ImageResponse } from "next/og";
import type { IconType } from "react-icons";
import { SiFacebook, SiInstagram, SiLinkedin, SiPinterest, SiTelegram, SiThreads, SiTiktok, SiWhatsapp, SiX, SiYoutube } from "react-icons/si";
import { SOCIAL_PLATFORMS, type SocialKey } from "@/lib/brand-defaults";

export const runtime = "nodejs";

const ICONS: Record<SocialKey, IconType> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  x: SiX,
  linkedin: SiLinkedin,
  threads: SiThreads,
  whatsapp: SiWhatsapp,
  telegram: SiTelegram,
  pinterest: SiPinterest,
};

/**
 * GET /api/brand/icon/:platform.png, a 64x64 PNG social icon for emails.
 * Gmail and Outlook strip SVG, so email footers need raster images; these
 * are drawn once from react-icons and cached for a year.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const key = platform.replace(/\.png$/, "") as SocialKey;
  const Icon = ICONS[key];
  const meta = SOCIAL_PLATFORMS.find((p) => p.key === key);
  if (!Icon || !meta) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 32, background: meta.color }}>
        <Icon size={34} color="#FFFFFF" />
      </div>
    ),
    { width: 64, height: 64, headers: { "Cache-Control": "public, max-age=31536000, immutable" } }
  );
}
