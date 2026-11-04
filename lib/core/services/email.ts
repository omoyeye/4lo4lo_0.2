import { getTransport, type MailTransport } from "./mailer";
import {
  emailFrom,
  esc,
  infoBox,
  paragraph,
  renderEmail,
  renderText,
  unsubscribeApiUrl,
  unsubscribeUrl,
} from "./email-layout";
import { siteUrl } from "@/lib/seo";
import { getBrand } from "@/lib/brand";

/**
 * Transactional and announcement emails. Every template uses the shared
 * layout in ./email-layout.ts so they all look the same and stay compliant
 * (sender identity, postal address, unsubscribe on announcements).
 */

export interface WelcomeEmailData {
  username: string;
  email: string;
  referralCode: string;
  referralLink: string;
}

export interface PasswordResetEmailData {
  username: string;
  email: string;
  resetLink: string;
}

export interface PasswordResetConfirmationData {
  username: string;
  email: string;
  loginLink: string;
}

/* ───────────────────────────── Welcome ───────────────────────────── */

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  const brand = await getBrand();
  const name = esc(data.username);
  const steps = [
    ["Finish a task", "Pick one on the Tasks page and earn your first points."],
    ["Check in daily", "Open 4LO4LO every day to grow your streak and unlock bonuses."],
    ["Invite friends", "Share your link and earn when they join and take part."],
  ];
  const stepsHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px">${steps
    .map(
      ([t, d], i) => `<tr><td style="padding:8px 0;vertical-align:top;width:40px">
        <div style="width:28px;height:28px;border-radius:14px;background:#F5F3FF;color:#7C3AED;font-weight:700;text-align:center;line-height:28px">${i + 1}</div></td>
        <td style="padding:8px 0"><strong>${t}</strong><br><span style="color:#6B7280;font-size:14px">${d}</span></td></tr>`
    )
    .join("")}</table>`;

  await getTransport().sendMail({
    from: emailFrom(brand),
    to: `${data.username} <${data.email}>`,
    subject: `Welcome to ${brand.name}, ${data.username}!`,
    html: renderEmail({
      preheader: "Your account is ready. Here's how to earn your first points.",
      eyebrow: "WELCOME",
      title: `You're in, ${data.username}!`,
      bodyHtml:
        paragraph(`Hi ${name}, welcome to the 4LO4LO creator community. Here's how to get started:`) +
        stepsHtml +
        infoBox(`Your referral code: <strong style="font-size:16px;letter-spacing:1px">${esc(data.referralCode)}</strong><br><a href="${data.referralLink}" style="color:#7C3AED;word-break:break-all">${esc(data.referralLink)}</a>`),
      cta: { label: "Start earning", url: `${siteUrl()}/tasks` },
      note: "We also sent a separate email to confirm your address. You'll need a confirmed email to request payouts.",
    }, brand),
    text: renderText([
      `Welcome to 4LO4LO, ${data.username}!`,
      "",
      "1. Finish a task on the Tasks page to earn your first points.",
      "2. Open 4LO4LO every day to grow your streak.",
      "3. Invite friends with your referral link.",
      "",
      `Your referral code: ${data.referralCode}`,
      `Your referral link: ${data.referralLink}`,
      "",
      `Start earning: ${siteUrl()}/tasks`,
    ], undefined, brand),
  });
  return true;
}

/* ───────────────────────────── Password reset ───────────────────────────── */

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
  const brand = await getBrand();
  try {
    await getTransport().sendMail({
      from: emailFrom(brand),
      to: `${data.username} <${data.email}>`,
      subject: "Reset your 4LO4LO password",
      html: renderEmail({
        preheader: "Use this link to choose a new password. It expires in 1 hour.",
        eyebrow: "SECURITY",
        title: "Reset your password",
        bodyHtml: paragraph(`Hi ${esc(data.username)}, we received a request to reset the password for your 4LO4LO account. Tap the button to choose a new one.`),
        cta: { label: "Choose a new password", url: data.resetLink },
        note: "This link expires in 1 hour and works once. If you didn't ask for this, you can ignore this email: your password won't change.",
      }, brand),
      text: renderText([
        `Hi ${data.username},`,
        "",
        "Reset your 4LO4LO password with this link (expires in 1 hour, works once):",
        data.resetLink,
        "",
        "If you didn't ask for this, ignore this email.",
      ], undefined, brand),
    });
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

export async function sendPasswordResetConfirmationEmail(data: PasswordResetConfirmationData): Promise<boolean> {
  const brand = await getBrand();
  try {
    await getTransport().sendMail({
      from: emailFrom(brand),
      to: `${data.username} <${data.email}>`,
      subject: "Your 4LO4LO password was changed",
      html: renderEmail({
        preheader: "Your password has been changed.",
        eyebrow: "SECURITY",
        title: "Your password was changed",
        bodyHtml:
          paragraph(`Hi ${esc(data.username)}, the password for your 4LO4LO account was just changed. You can now sign in with your new password.`) +
          infoBox(`<strong>Wasn't you?</strong> Reset your password again straight away and contact <a href="mailto:support@4lo4lo.site" style="color:#7C3AED">support@4lo4lo.site</a>.`),
        cta: { label: "Sign in", url: data.loginLink },
      }, brand),
      text: renderText([
        `Hi ${data.username},`,
        "",
        "Your 4LO4LO password was just changed.",
        `Sign in: ${data.loginLink}`,
        "",
        "Wasn't you? Reset your password again and contact support@4lo4lo.site.",
      ], undefined, brand),
    });
    return true;
  } catch (error) {
    console.error("Error sending password reset confirmation email:", error);
    return false;
  }
}

/* ───────────────────────────── Announcements ───────────────────────────── */

export interface BulkEmailData {
  subject: string;
  htmlContent: string;
  textContent?: string;
  /** Only members who haven't opted out of announcements (see lib/core/announcement-recipients.ts). */
  recipients: Array<{ id: number; email: string; username: string }>;
}

/**
 * Announcement emails from the admin Email Center. Each one carries a
 * personal unsubscribe link plus List-Unsubscribe headers, which Gmail and
 * Yahoo require for bulk senders and CAN-SPAM / PECR require for marketing.
 */
export async function sendBulkEmail(data: BulkEmailData): Promise<{ success: number; failed: number; errors: string[] }> {
  const transporter: MailTransport = getTransport();
  const brand = await getBrand();
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipient of data.recipients) {
    const fill = (s: string, escape: boolean) => s.replace(/\{\{username\}\}/g, escape ? esc(recipient.username) : recipient.username);
    const unsub = unsubscribeUrl(recipient.id);
    try {
      await transporter.sendMail({
        from: emailFrom(brand),
        to: `${recipient.username} <${recipient.email}>`,
        subject: fill(data.subject, false),
        html: renderEmail({
          preheader: fill(data.textContent || data.subject, false).slice(0, 120),
          eyebrow: "ANNOUNCEMENT",
          title: fill(data.subject, false),
          bodyHtml: `<div style="font-size:15px;line-height:1.65">${fill(data.htmlContent, true)}</div>`,
          unsubscribeUrl: unsub,
        }, brand),
        text: renderText([fill(data.textContent || data.htmlContent.replace(/<[^>]*>/g, ""), false)], unsub, brand),
        headers: {
          "List-Unsubscribe": `<${unsubscribeApiUrl(recipient.id)}>, <mailto:support@4lo4lo.site?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      success++;
    } catch (error: any) {
      failed++;
      errors.push(`Failed to send to ${recipient.email}: ${error.message}`);
      console.error(`Failed to send announcement to ${recipient.email}:`, error.message);
    }
  }

  transporter.close();
  return { success, failed, errors };
}
