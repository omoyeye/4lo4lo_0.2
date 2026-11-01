import { createHash, randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import type { User } from "@shared/schema.mysql";
import { getTransport } from "@/lib/core/services/mailer";
import { getBrand } from "@/lib/brand";
import { emailFrom, esc, paragraph, renderEmail, renderText } from "@/lib/core/services/email-layout";
import { execute, getSettingBool, isMissingTable, queryRows } from "@/lib/core/sql-utils";
import { siteUrl } from "@/lib/seo";

/**
 * Email verification (scripts/sql/009 email_verifications).
 *
 * A member counts as verified when a row exists for them with verified_at set
 * AND the address matches their current email, so changing the email
 * requires verifying again. Before the table exists nobody is gated.
 */

const RESEND_COOLDOWN_MS = 60_000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Synthetic or anonymized addresses that can never receive mail. */
export function isUndeliverable(email: string): boolean {
  return /@(google\.user|deleted\.invalid)$/i.test(email) || !email.includes("@");
}

export interface VerificationStatus {
  enabled: boolean;
  verified: boolean;
  required: boolean;
  email: string;
  sentAt: string | null;
}

export async function getVerificationStatus(user: User): Promise<VerificationStatus> {
  const required = await getSettingBool("email_verification_required", true);
  try {
    const rows = await queryRows<{ email: string; verified_at: string | null; sent_at: string | null }>(
      sql`SELECT email, verified_at, sent_at FROM email_verifications WHERE user_id = ${user.id} LIMIT 1`
    );
    const row = rows[0];
    const verified = !!row?.verified_at && row.email.toLowerCase() === user.email.toLowerCase();
    return { enabled: true, verified, required, email: user.email, sentAt: row?.sent_at ?? null };
  } catch (err) {
    if (isMissingTable(err)) return { enabled: false, verified: true, required: false, email: user.email, sentAt: null };
    throw err;
  }
}

/** True when this member may do things that need a verified email (payouts). */
export async function passesEmailGate(user: User): Promise<boolean> {
  const status = await getVerificationStatus(user);
  return !status.enabled || !status.required || status.verified;
}

export class VerificationError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function sendVerificationEmail(user: User): Promise<void> {
  if (isUndeliverable(user.email)) throw new VerificationError("Add a real email address in Settings first", 400);

  const rows = await queryRows<{ sent_at: string | null; verified_at: string | null; email: string }>(
    sql`SELECT sent_at, verified_at, email FROM email_verifications WHERE user_id = ${user.id} LIMIT 1`
  );
  const row = rows[0];
  if (row?.verified_at && row.email.toLowerCase() === user.email.toLowerCase()) {
    throw new VerificationError("Your email is already verified", 409);
  }
  if (row?.sent_at && Date.now() - new Date(row.sent_at).getTime() < RESEND_COOLDOWN_MS) {
    throw new VerificationError("We just sent one. Please wait a minute before asking again.", 429);
  }

  const token = randomBytes(32).toString("hex");
  await execute(sql`
    INSERT INTO email_verifications (user_id, email, token_hash, sent_at, verified_at)
    VALUES (${user.id}, ${user.email}, ${hash(token)}, NOW(), NULL)
    ON DUPLICATE KEY UPDATE email = VALUES(email), token_hash = VALUES(token_hash), sent_at = NOW(), verified_at = NULL
  `);

  const link = `${siteUrl()}/verify-email?token=${token}`;
  const name = user.displayName || user.username;
  const brand = await getBrand();
  await getTransport().sendMail({
    from: emailFrom(brand),
    to: `${name} <${user.email}>`,
    subject: "Confirm your 4LO4LO email",
    html: renderEmail({
      preheader: "One tap to confirm your email address.",
      eyebrow: "ACCOUNT",
      title: "Confirm your email",
      bodyHtml: paragraph(`Hi ${esc(name)}, please confirm this is your email address. You need a confirmed email to request payouts, and it lets us reach you about your account.`),
      cta: { label: "Confirm email", url: link },
      note: "If you didn't create a 4LO4LO account, you can ignore this email.",
    }, brand),
    text: renderText([`Hi ${name},`, "", "Confirm your 4LO4LO email address:", link, "", "If you didn't create a 4LO4LO account, ignore this email."], undefined, brand),
  });
}

/** Marks the token's owner verified. Returns their user id, or null for a bad/used token. */
export async function confirmToken(token: string): Promise<number | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const rows = await queryRows<{ user_id: number }>(
    sql`SELECT user_id FROM email_verifications WHERE token_hash = ${hash(token)} LIMIT 1`
  );
  const row = rows[0];
  if (!row) return null;
  await execute(sql`UPDATE email_verifications SET verified_at = NOW(), token_hash = NULL WHERE user_id = ${row.user_id}`);
  return row.user_id;
}
