import type { IconType } from "react-icons";
import {
  SiDiscord,
  SiFacebook,
  SiGoogle,
  SiInstagram,
  SiLinkedin,
  SiPinterest,
  SiSnapchat,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

/** Platforms tasks can target: label, brand colour and icon. Order = filter order. */
export const PLATFORMS: { key: string; label: string; color: string; icon: IconType | typeof ClipboardList }[] = [
  { key: "instagram", label: "Instagram", color: "#E4405F", icon: SiInstagram },
  { key: "tiktok", label: "TikTok", color: "#111111", icon: SiTiktok },
  { key: "youtube", label: "YouTube", color: "#FF0000", icon: SiYoutube },
  { key: "facebook", label: "Facebook", color: "#1877F2", icon: SiFacebook },
  { key: "twitter", label: "X (Twitter)", color: "#111111", icon: SiX },
  { key: "whatsapp", label: "WhatsApp", color: "#25D366", icon: SiWhatsapp },
  { key: "telegram", label: "Telegram", color: "#26A5E4", icon: SiTelegram },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2", icon: SiLinkedin },
  { key: "snapchat", label: "Snapchat", color: "#F7C600", icon: SiSnapchat },
  { key: "pinterest", label: "Pinterest", color: "#BD081C", icon: SiPinterest },
  { key: "discord", label: "Discord", color: "#5865F2", icon: SiDiscord },
  { key: "threads", label: "Threads", color: "#111111", icon: SiThreads },
  { key: "google_review", label: "Google Review", color: "#4285F4", icon: SiGoogle },
  { key: "survey", label: "Survey", color: "#7C3AED", icon: ClipboardList },
];

export function platformInfo(key: string | null | undefined) {
  const k = (key ?? "").toLowerCase();
  return PLATFORMS.find((p) => p.key === k) ?? { key: k, label: k ? k.charAt(0).toUpperCase() + k.slice(1) : "Other", color: "#7C3AED", icon: ClipboardList };
}

/** Rounded brand-coloured tile with the platform's icon. */
export function PlatformBadge({ platform, size = 40, className }: { platform: string; size?: number; className?: string }) {
  const p = platformInfo(platform);
  const Icon = p.icon;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-xl text-white shadow-sm", className)}
      style={{ width: size, height: size, background: p.color }}
      title={p.label}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}
