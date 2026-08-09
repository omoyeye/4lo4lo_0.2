import nodemailer, { Transporter } from "nodemailer";

/**
 * Single shared SMTP transport.
 *
 * Replaces five near-identical inline createTransport() calls that each
 * carried the same three problems:
 *   - a hardcoded Brevo username as a fallback, so a missing EMAIL_USER
 *     silently authenticated as someone else's account instead of failing;
 *   - `tls: { rejectUnauthorized: false }`, which disables certificate
 *     verification and makes the connection MITM-able in production;
 *   - `debug: true`, which writes SMTP conversations (including auth) to logs.
 *
 * Nodemailer pools connections, so reusing one transport is also faster than
 * building a new one per send.
 */

const globalForMailer = global as unknown as { __mailer?: Transporter };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
}

export function getTransport(): Transporter {
  if (globalForMailer.__mailer) return globalForMailer.__mailer;

  if (!isEmailConfigured()) {
    throw new Error(
      "Email is not configured. Set EMAIL_USER and EMAIL_PASSWORD (see .env.example)."
    );
  }

  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    pool: true,
    maxConnections: 3,
    // Certificate verification stays on. If your provider genuinely needs it
    // relaxed, set EMAIL_ALLOW_SELF_SIGNED=true explicitly and only in dev.
    tls:
      process.env.EMAIL_ALLOW_SELF_SIGNED === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  globalForMailer.__mailer = transport;
  return transport;
}

/** Default From header, overridable per deployment. */
export function defaultFrom(): string {
  return (
    process.env.EMAIL_FROM ||
    '"4LO4LO - Social Growth Platform" <noreply@4lo4lo.site>'
  );
}
