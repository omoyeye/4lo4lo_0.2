import { NextRequest, NextResponse } from "next/server";
import { getTransport, defaultFrom, isEmailConfigured } from "@/lib/core/services/mailer";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
});

/** Strip anything that could inject extra SMTP headers via a form field. */
function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * POST /api/support/contact
 *
 * This route previously built a transport, never called sendMail, and returned
 * "Your message has been sent successfully." Every support request submitted
 * through the site was silently discarded.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, LIMITS.contact);
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "All fields are required and must be valid.", errors: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parsed.data;

    const destination = process.env.SUPPORT_INBOX || process.env.EMAIL_USER;

    if (!isEmailConfigured() || !destination) {
      // Fail loudly rather than telling the user their message was delivered.
      console.error(
        "Support contact submitted but email is not configured, message dropped:",
        { name, email, subject }
      );
      return NextResponse.json(
        {
          message:
            "Support email is not configured on this server. Please contact us directly.",
        },
        { status: 503 }
      );
    }

    await getTransport().sendMail({
      from: defaultFrom(),
      to: destination,
      replyTo: `${headerSafe(name)} <${headerSafe(email)}>`,
      subject: `[Support] ${headerSafe(subject)}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `
        <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <hr />
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      `,
    });

    return NextResponse.json(
      { message: "Your message has been sent successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Support contact error:", error);
    return NextResponse.json(
      { message: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
