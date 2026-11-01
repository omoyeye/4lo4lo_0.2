import { createHmac, timingSafeEqual } from "crypto";
import { activeSocials, DEFAULT_BRAND, type BrandProfile } from "@/lib/brand-defaults";
import { siteUrl } from "@/lib/seo";

/**
 * One branded, mobile-friendly layout for every email 4LO4LO sends.
 *
 * Email HTML has to survive Gmail, Outlook and Apple Mail, so this is
 * table-based with inline styles, a single 560px column, no web fonts and
 * no background images: the boring choices that render everywhere. Dark mode
 * clients invert it cleanly because every colour is set explicitly.
 */

/** From header. The address must stay on the domain the mail provider has verified. */
export function emailFrom(brand: BrandProfile = DEFAULT_BRAND, suffix = ""): string {
  return `"${brand.name.replace(/"/g, "")}${suffix}" <noreply@4lo4lo.site>`;
}
export const EMAIL_FROM = emailFrom();

const BRAND = "#7C3AED";
const BRAND_2 = "#DB2777";
const TEXT = "#1F2937";
const MUTED = "#6B7280";

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface EmailContent {
  /** Inbox preview line (hidden in the body). */
  preheader: string;
  /** Small coloured label above the title, e.g. "SECURITY". */
  eyebrow?: string;
  title: string;
  /** Trusted HTML for the body (escape any user text with esc()). */
  bodyHtml: string;
  cta?: { label: string; url: string };
  /** Grey text under the button, e.g. "This link expires in 1 hour." */
  note?: string;
  /** Marketing/announcement emails only: adds the unsubscribe line. */
  unsubscribeUrl?: string;
}

export function renderEmail(c: EmailContent, brand: BrandProfile = DEFAULT_BRAND): string {
  const year = new Date().getFullYear();
  const logo = brand.logoUrl || `${siteUrl()}/icon-192.png`;
  const socials = activeSocials(brand);
  const socialRow = socials.length
    ? `<p style="margin:0 0 12px">${socials
        .map(
          (s) =>
            `<a href="${esc(s.url)}" style="display:inline-block;margin:0 4px;text-decoration:none"><img src="${siteUrl()}/api/brand/icon/${s.key}.png" width="28" height="28" alt="${esc(s.label)}" style="display:block;border:0;border-radius:14px"></a>`
        )
        .join("")}</p>`
    : "";
  const button = c.cta
    ? `<tr><td style="padding:8px 0 4px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:${BRAND};background-image:linear-gradient(90deg,${BRAND},${BRAND_2})">
          <a href="${c.cta.url}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${esc(c.cta.label)}</a>
        </td></tr></table>
        <p style="margin:14px 0 0;font-size:12px;color:${MUTED};line-height:1.5">Button not working? Paste this link into your browser:<br><a href="${c.cta.url}" style="color:${BRAND};word-break:break-all">${esc(c.cta.url)}</a></p>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(c.title)}</title></head>
<body style="margin:0;padding:0;background:#F4F2FA;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2FA"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 4px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td><a href="${siteUrl()}"><img src="${esc(logo)}" width="40" height="40" alt="" style="display:block;border:0;border-radius:10px"></a></td>
        <td style="padding-left:10px;font:800 20px Arial,sans-serif;color:${BRAND};letter-spacing:-.3px">${esc(brand.name)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 10px rgba(76,29,149,.06)">
      <div style="height:5px;background:${BRAND};background-image:linear-gradient(90deg,${BRAND},${BRAND_2})"></div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 32px 28px;font-family:Arial,Helvetica,sans-serif;color:${TEXT};font-size:15px;line-height:1.65">
        ${c.eyebrow ? `<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.12em;color:${BRAND}">${esc(c.eyebrow)}</p>` : ""}
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#111827">${esc(c.title)}</h1>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td>${c.bodyHtml}</td></tr>
          ${button}
          ${c.note ? `<tr><td style="padding-top:18px;font-size:13px;color:${MUTED}">${esc(c.note)}</td></tr>` : ""}
        </table>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:20px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED}">
      ${socialRow}
      <p style="margin:0 0 6px"><a href="${siteUrl()}" style="color:${MUTED}">4lo4lo.site</a> &nbsp;·&nbsp; <a href="${siteUrl()}/support" style="color:${MUTED}">Help</a> &nbsp;·&nbsp; <a href="${siteUrl()}/privacy" style="color:${MUTED}">Privacy</a></p>
      ${c.unsubscribeUrl ? `<p style="margin:0 0 6px">You're getting this because you're a ${esc(brand.name)} member. <a href="${c.unsubscribeUrl}" style="color:${MUTED};text-decoration:underline">Unsubscribe from announcements</a></p>` : ""}
      <p style="margin:0">© ${year} ${esc(brand.legalName)}${brand.postalAddress ? ` · ${esc(brand.postalAddress)}` : ""}</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** Plain-text twin for clients that don't render HTML (and spam filters that like both). */
export function renderText(lines: (string | false | null | undefined)[], unsubscribeUrl?: string, brand: BrandProfile = DEFAULT_BRAND): string {
  return [
    ...lines.filter(Boolean),
    "",
    "—",
    `${brand.name} · ${siteUrl()}`,
    unsubscribeUrl ? `Unsubscribe from announcements: ${unsubscribeUrl}` : null,
    brand.postalAddress ? `${brand.legalName}, ${brand.postalAddress}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export const paragraph = (html: string) => `<p style="margin:0 0 14px">${html}</p>`;

export const infoBox = (html: string) =>
  `<div style="margin:6px 0 18px;padding:14px 16px;border-radius:12px;background:#F5F3FF;border:1px solid #EDE9FE;font-size:14px;color:#4C1D95">${html}</div>`;

/* ───────────────────────── Unsubscribe links ───────────────────────── */

function unsubSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET ?? "4lo4lo";
}

export function unsubscribeToken(userId: number): string {
  return createHmac("sha256", unsubSecret()).update(`unsub:${userId}`).digest("base64url").slice(0, 32);
}

export function verifyUnsubscribeToken(userId: number, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Link for the footer and the List-Unsubscribe header (one-click capable). */
export function unsubscribeUrl(userId: number): string {
  return `${siteUrl()}/unsubscribe?u=${userId}&t=${unsubscribeToken(userId)}`;
}

export function unsubscribeApiUrl(userId: number): string {
  return `${siteUrl()}/api/email/unsubscribe?u=${userId}&t=${unsubscribeToken(userId)}`;
}
