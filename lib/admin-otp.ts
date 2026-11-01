import { createHmac, randomInt, timingSafeEqual } from "crypto";
import type { User } from "@shared/schema.mysql";
import { getTransport } from "@/lib/core/services/mailer";
import { getBrand } from "@/lib/brand";
import { emailFrom, esc, paragraph, renderEmail, renderText } from "@/lib/core/services/email-layout";

/**
 * Emailed sign-in codes for the admin panel.
 *
 * Every admin sign-in sends a 6-digit code to the admin's email; the panel and
 * the admin APIs only accept a session that was created with a valid code
 * (token.adminVerified, see auth.ts and lib/auth-helpers.ts).
 *
 * Codes are stateless on purpose: the "challenge" handed to the browser is an
 * HMAC over the user, the code, an expiry and a slice of the password hash. So
 * nothing has to be stored, no database migration is needed, and changing the
 * password voids every outstanding code. Guessing is bounded by the per-admin
 * attempt limit in the login route plus the 10 minute expiry.
 *
 * Escape hatch: ADMIN_EMAIL_OTP=off on Vercel turns this off (e.g. if email
 * sending breaks), so admins are never locked out of their own panel.
 */

const TTL_MS = 10 * 60 * 1000;

export function adminOtpEnabled(): boolean {
  return process.env.ADMIN_EMAIL_OTP !== "off";
}

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

function sign(userId: number, exp: number, code: string, passwordHash: string): string {
  return createHmac("sha256", secret())
    .update(`admin-otp:${userId}:${exp}:${code}:${passwordHash.slice(-24)}`)
    .digest("base64url");
}

/** "j***@gmail.com", so the screen can say where the code went without revealing the address. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "your email";
  return `${name.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(6, name.length - 1)))}@${domain}`;
}

/** Creates a code, emails it, and returns the challenge the browser sends back with the code. */
export async function sendAdminCode(user: User): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const exp = Date.now() + TTL_MS;
  const challenge = `${user.id}.${exp}.${sign(user.id, exp, code, user.password)}`;
  const name = user.displayName || user.username;

  const brand = await getBrand();
  await getTransport().sendMail({
    from: emailFrom(brand, " Security"),
    to: `${name} <${user.email}>`,
    subject: `${code} is your 4LO4LO admin sign-in code`,
    html: renderEmail({
      preheader: `Your admin sign-in code is ${code}. It expires in 10 minutes.`,
      eyebrow: "ADMIN SECURITY",
      title: "Your sign-in code",
      bodyHtml:
        paragraph(`Hi ${esc(name)}, enter this code to finish signing in to the 4LO4LO admin panel:`) +
        `<div style="margin:8px 0 18px;padding:18px;border-radius:14px;background:#F5F3FF;border:1px solid #EDE9FE;text-align:center;font:700 34px/1 'Courier New',monospace;letter-spacing:10px;color:#5B21B6">${code}</div>`,
      note: "It expires in 10 minutes. If you didn't just try to sign in, change your password now: someone else knows it.",
    }, brand),
    text: renderText([`Your 4LO4LO admin sign-in code is ${code}`, "", "It expires in 10 minutes. If you didn't just try to sign in, change your password now."], undefined, brand),
  });

  return challenge;
}

/** True when `code` matches the challenge issued for this user and it hasn't expired. */
export function verifyAdminCode(user: User, challenge: string | undefined | null, code: string | undefined | null): boolean {
  if (!challenge || !code || !/^\d{6}$/.test(code)) return false;
  const [uid, expStr, mac] = challenge.split(".");
  const exp = Number(expStr);
  if (Number(uid) !== user.id || !Number.isFinite(exp) || Date.now() > exp || !mac) return false;
  const expected = Buffer.from(sign(user.id, exp, code, user.password));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
