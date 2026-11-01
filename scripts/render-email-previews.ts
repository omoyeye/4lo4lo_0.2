/**
 * Writes every email template to HTML files for previewing, using a fake
 * transport (nothing is sent). Usage: npx tsx scripts/render-email-previews.ts <outDir>
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const out = process.argv[2] ?? "email-previews";
const sent: { subject: string; html: string }[] = [];
(globalThis as unknown as { __mailer: unknown }).__mailer = {
  sendMail: async (m: { subject: string; html: string }) => void sent.push(m),
  close: () => {},
};
process.env.NEXT_PUBLIC_SITE_URL ??= "https://4lo4lo.site";
process.env.NEXTAUTH_SECRET ??= "preview-only";
process.env.DATABASE_URL ??= "mysql://preview:preview@127.0.0.1:1/preview";

async function main() {
  const { primeBrandCache } = await import("../lib/brand");
  const { DEFAULT_BRAND } = await import("../lib/brand-defaults");
  // Sample brand so the previews show the logo, socials and footer details.
  primeBrandCache({
    ...DEFAULT_BRAND,
    legalName: "4LO4LO Ltd",
    postalAddress: "1 Example Street, London, UK",
    socials: { instagram: "https://instagram.com/4lo4lo", tiktok: "https://tiktok.com/@4lo4lo", facebook: "https://facebook.com/4lo4lo", x: "https://x.com/4lo4lo", youtube: "https://youtube.com/@4lo4lo" },
  });
  const email = await import("../lib/core/services/email");
  const { sendAdminCode } = await import("../lib/admin-otp");
  const { renderEmail, paragraph } = await import("../lib/core/services/email-layout");
  const { getBrand } = await import("../lib/brand");
  const brand = await getBrand();
  const user = { id: 1, username: "ada", displayName: "Ada", email: "ada@example.com", password: "x".repeat(40) } as never;

  await email.sendWelcomeEmail({ username: "ada", email: "ada@example.com", referralCode: "ADA42XYZ", referralLink: "https://4lo4lo.site/auth?ref=ADA42XYZ" });
  await email.sendPasswordResetEmail({ username: "ada", email: "ada@example.com", resetLink: "https://4lo4lo.site/reset-password?token=example" });
  await email.sendPasswordResetConfirmationEmail({ username: "ada", email: "ada@example.com", loginLink: "https://4lo4lo.site/auth" });
  await sendAdminCode(user);
  await email.sendBulkEmail({
    subject: "New tasks are live, {{username}}!",
    htmlContent: "<p>Hi {{username}},</p><p>We've just added <strong>20 new tasks</strong> worth up to 150 points each. Jump in before they're gone.</p>",
    recipients: [{ id: 1, email: "ada@example.com", username: "ada" }],
  });
  sent.push({
    subject: "Confirm your 4LO4LO email",
    html: renderEmail({
      preheader: "One tap to confirm your email address.",
      eyebrow: "ACCOUNT",
      title: "Confirm your email",
      bodyHtml: paragraph("Hi Ada, please confirm this is your email address. You need a confirmed email to request payouts, and it lets us reach you about your account."),
      cta: { label: "Confirm email", url: "https://4lo4lo.site/verify-email?token=example" },
      note: "If you didn't create a 4LO4LO account, you can ignore this email.",
    }, brand),
  });

  mkdirSync(out, { recursive: true });
  const names = ["welcome", "password-reset", "password-changed", "admin-code", "announcement", "confirm-email"];
  sent.forEach((m, i) => writeFileSync(join(out, `${names[i]}.html`), m.html));
  writeFileSync(
    join(out, "index.html"),
    `<!doctype html><meta charset=utf-8><title>Email previews</title><body style="font-family:Arial;padding:24px;background:#eee"><h2>4LO4LO email previews</h2>${names
      .map((n, i) => `<h3>${sent[i].subject}</h3><iframe src="${n}.html" style="width:640px;height:720px;border:0;border-radius:12px;background:#fff"></iframe>`)
      .join("")}`
  );
  console.log(`Wrote ${sent.length} previews to ${out}`);
}
main();
