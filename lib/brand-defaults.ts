/**
 * Brand profile: name, legal details, logo and social links, edited by
 * superadmins in Admin → Brand and stored as JSON in app_settings
 * ("brand_profile"). This file holds the shape, the defaults used before
 * anything is saved, and parsing; it is safe to import in client code.
 * Server code reads the saved profile through lib/brand.ts.
 */

export const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook", color: "#1877F2", placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", color: "#E4405F", placeholder: "https://instagram.com/yourhandle" },
  { key: "tiktok", label: "TikTok", color: "#000000", placeholder: "https://tiktok.com/@yourhandle" },
  { key: "youtube", label: "YouTube", color: "#FF0000", placeholder: "https://youtube.com/@yourchannel" },
  { key: "x", label: "X (Twitter)", color: "#000000", placeholder: "https://x.com/yourhandle" },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2", placeholder: "https://linkedin.com/company/yourcompany" },
  { key: "threads", label: "Threads", color: "#000000", placeholder: "https://threads.net/@yourhandle" },
  { key: "whatsapp", label: "WhatsApp", color: "#25D366", placeholder: "https://wa.me/2348000000000" },
  { key: "telegram", label: "Telegram", color: "#26A5E4", placeholder: "https://t.me/yourchannel" },
  { key: "pinterest", label: "Pinterest", color: "#BD081C", placeholder: "https://pinterest.com/yourprofile" },
] as const;

export type SocialKey = (typeof SOCIAL_PLATFORMS)[number]["key"];

export interface BrandProfile {
  /** Display name used in emails, footers and legal text. */
  name: string;
  /** Registered business name: the operator / data controller in the legal pages. */
  legalName: string;
  tagline: string;
  supportEmail: string;
  /** Postal address for legal notices and email footers (required by CAN-SPAM for announcements). */
  postalAddress: string;
  /** Absolute https URL of a PNG/JPG logo for emails. Empty uses the site icon. */
  logoUrl: string;
  socials: Partial<Record<SocialKey, string>>;
}

export const DEFAULT_BRAND: BrandProfile = {
  name: "4LO4LO",
  legalName: "4LO4LO",
  tagline: "A global community for creators and influencers",
  supportEmail: "support@4lo4lo.site",
  postalAddress: "",
  logoUrl: "",
  socials: {},
};

export const BRAND_SETTING_KEY = "brand_profile";

/** Lenient parse of the stored JSON: unknown keys dropped, missing ones defaulted. */
export function parseBrand(raw: string | null | undefined): BrandProfile {
  if (!raw) return DEFAULT_BRAND;
  try {
    const v = JSON.parse(raw) as Partial<BrandProfile>;
    const socials: BrandProfile["socials"] = {};
    for (const p of SOCIAL_PLATFORMS) {
      const url = v.socials?.[p.key];
      if (typeof url === "string" && /^https:\/\//.test(url)) socials[p.key] = url;
    }
    const str = (x: unknown, d: string) => (typeof x === "string" && x.trim() ? x.trim() : d);
    return {
      name: str(v.name, DEFAULT_BRAND.name),
      legalName: str(v.legalName, str(v.name, DEFAULT_BRAND.legalName)),
      tagline: str(v.tagline, DEFAULT_BRAND.tagline),
      supportEmail: str(v.supportEmail, DEFAULT_BRAND.supportEmail),
      postalAddress: typeof v.postalAddress === "string" ? v.postalAddress.trim() : "",
      logoUrl: typeof v.logoUrl === "string" && /^https:\/\//.test(v.logoUrl) ? v.logoUrl : "",
      socials,
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

/** Socials that have a link, in display order. */
export function activeSocials(brand: BrandProfile) {
  return SOCIAL_PLATFORMS.filter((p) => brand.socials[p.key]).map((p) => ({ ...p, url: brand.socials[p.key]! }));
}
