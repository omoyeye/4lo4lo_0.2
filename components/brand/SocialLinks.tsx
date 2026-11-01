"use client";

import type { IconType } from "react-icons";
import { SiFacebook, SiInstagram, SiLinkedin, SiPinterest, SiTelegram, SiThreads, SiTiktok, SiWhatsapp, SiX, SiYoutube } from "react-icons/si";
import { activeSocials, type SocialKey } from "@/lib/brand-defaults";
import { useBrand } from "@/hooks/use-brand";
import { cn } from "@/lib/utils";

export const SOCIAL_ICONS: Record<SocialKey, IconType> = {
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

/** The brand's social links (Admin → Brand) as icon buttons. Renders nothing until one is set. */
export default function SocialLinks({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  const socials = activeSocials(useBrand());
  if (!socials.length) return null;
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {socials.map((s) => {
        const Icon = SOCIAL_ICONS[s.key];
        return (
          <a
            key={s.key}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            title={s.label}
            className={cn("flex items-center justify-center rounded-full border bg-background text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-white", box)}
            onMouseEnter={(e) => (e.currentTarget.style.background = s.color)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <Icon className={icon} />
          </a>
        );
      })}
    </div>
  );
}
