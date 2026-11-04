/**
 * Single shared mail transport: Brevo's transactional API, authenticated with
 * BREVO_API_KEY. Nothing else is needed to send email.
 */

export interface MailMessage {
  /** `"Name" <a@b.c>`, `Name <a@b.c>` or `a@b.c`. */
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
}

export interface MailTransport {
  sendMail(message: MailMessage): Promise<unknown>;
  close(): void;
}

const globalForMailer = global as unknown as { __mailer?: MailTransport };

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_TIMEOUT_MS = 15_000;
/** Brevo's limit on sender, recipient and reply-to names. */
const BREVO_NAME_MAX = 70;

function brevoApiKey(): string {
  return process.env.BREVO_API_KEY?.trim() ?? "";
}

export function isEmailConfigured(): boolean {
  return Boolean(brevoApiKey());
}

/** Splits an address header into the { email, name } shape Brevo takes. */
export function parseAddress(address: string): { email: string; name?: string } {
  const match = address.match(/^(.*)<([^<>]+)>\s*$/);
  if (!match) return { email: address.trim() };
  const name = match[1].replace(/"/g, "").trim().slice(0, BREVO_NAME_MAX);
  return { email: match[2].trim(), ...(name ? { name } : {}) };
}

function brevoTransport(apiKey: string): MailTransport {
  return {
    async sendMail(message) {
      const res = await fetch(BREVO_SEND_URL, {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: parseAddress(message.from),
          to: [parseAddress(message.to)],
          ...(message.replyTo ? { replyTo: parseAddress(message.replyTo) } : {}),
          subject: message.subject,
          // Brevo's guide allows one body type per request, so plain text is
          // sent only for a message with no HTML.
          ...(message.html ? { htmlContent: message.html } : { textContent: message.text ?? "" }),
          ...(message.headers ? { headers: message.headers } : {}),
        }),
        signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
      });
      if (res.ok) return res.json().catch(() => ({}));

      const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
      const reason = body?.message || body?.code || res.statusText || "no details";
      const hint = res.status === 401 || res.status === 403 ? " Check BREVO_API_KEY, and that Authorized IPs in Brevo isn't blocking Vercel." : "";
      throw new Error(`Brevo API ${res.status}: ${reason}.${hint}`);
    },
    close() {},
  };
}

export function getTransport(): MailTransport {
  if (globalForMailer.__mailer) return globalForMailer.__mailer;

  const apiKey = brevoApiKey();
  if (!apiKey) {
    throw new Error("Email is not configured. Set BREVO_API_KEY (see .env.example).");
  }

  const transport = brevoTransport(apiKey);
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
