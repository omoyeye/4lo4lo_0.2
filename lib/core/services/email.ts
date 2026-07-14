import nodemailer, { Transporter } from "nodemailer";

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

export async function sendWelcomeEmail(
  data: WelcomeEmailData,
): Promise<boolean> {
  const htmlContent = generateWelcomeEmailHTML(data);
  const textContent = generatePlainTextWelcome(data);

  // const emailPayload = {
  //   sender: {
  //     email: 'noreply@4lo4lo.site',
  //     name: '4LO4LO - Social Growth Platform'
  //   },
  //   to: [{
  //     email: data.email,
  //     name: data.username
  //   }],
  //   subject: `Welcome to 4LO4LO, ${data.username}! 🚀`,
  //   htmlContent,
  //   textContent,
  // };

  const transporter: Transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
    secure: false, //process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || "9a685a001@smtp-brevo.com",
      pass: process.env.EMAIL_PASSWORD || "",
    },
    tls: {
      rejectUnauthorized: false, // Only for development
    },
    debug: true, // Enable debug output
  });

  const mailOptions = {
    from: '"4LO4LO - Social Growth Platform" <noreply@4lo4lo.site>', //process.env.EMAIL_FROM,
    to: `${data.username} <${data.email}>`,
    subject: `Welcome to 4LO4LO, ${data.username}! 🚀`,
    html: htmlContent,
    text: textContent,
  };

  await transporter.sendMail(mailOptions);
  return true;

  // try {
  // const response = await fetch('https://api.brevo.com/v3/smtp/email', {
  //   method: 'POST',
  //   headers: {
  //     'accept': 'application/json',
  //     'api-key': process.env.BREVO_API_KEY || '',
  //     'content-type': 'application/json'
  //   },
  //   body: JSON.stringify(emailPayload)
  // });

  // if (!response.ok) {
  //   const errorData = await response.text();
  //   throw new Error(`Brevo API error: ${response.status} - ${errorData}`);
  // }

  //   console.log(`✅ Welcome email sent to ${data.email}`);
  //   return true;
  // } catch (error) {
  //   console.error('❌ Error sending welcome email:', error);
  //   return false;
  // }
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
  const htmlContent = generatePasswordResetEmailHTML(data);
  const textContent = generatePlainTextPasswordReset(data);
  
  const transporter: Transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || "9a685a001@smtp-brevo.com",
      pass: process.env.EMAIL_PASSWORD || "",
    },
    tls: {
      rejectUnauthorized: false,
    },
    debug: true,
  });

  const mailOptions = {
    from: '"4LO4LO - Social Growth Platform" <noreply@4lo4lo.site>',
    to: `${data.username} <${data.email}>`,
    subject: 'Reset Your 4LO4LO Password',
    html: htmlContent,
    text: textContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return false;
  }
}

export async function sendPasswordResetConfirmationEmail(data: PasswordResetConfirmationData): Promise<boolean> {
  const htmlContent = generatePasswordResetConfirmationHTML(data);
  const textContent = generatePlainTextPasswordResetConfirmation(data);
  
  const transporter: Transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || "9a685a001@smtp-brevo.com",
      pass: process.env.EMAIL_PASSWORD || "",
    },
    tls: {
      rejectUnauthorized: false,
    },
    debug: true,
  });

  const mailOptions = {
    from: '"4LO4LO - Social Growth Platform" <noreply@4lo4lo.site>',
    to: `${data.username} <${data.email}>`,
    subject: 'Your 4LO4LO Password Has Been Reset',
    html: htmlContent,
    text: textContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset confirmation email sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset confirmation email:', error);
    return false;
  }
}

function generatePasswordResetConfirmationHTML(data: PasswordResetConfirmationData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .content {
      padding: 40px;
      text-align: center;
    }
    h1 {
      color: #1f2937;
      margin-bottom: 20px;
    }
    p {
      color: #4b5563;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .success-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 20px;
    }
    .security-note {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      padding: 15px;
      border-radius: 8px;
      margin-top: 30px;
      text-align: left;
    }
    .security-note h3 {
      color: #92400e;
      margin: 0 0 10px 0;
      font-size: 14px;
    }
    .security-note p {
      color: #92400e;
      font-size: 13px;
      margin: 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      color: #6b7280;
      font-size: 12px;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">4LO4LO</div>
      <p style="margin: 0; opacity: 0.9;">Password Reset Successful</p>
    </div>
    <div class="content">
      <div class="success-icon">✅</div>
      <h1>Password Changed Successfully!</h1>
      <p>Hi ${data.username},</p>
      <p>Your password has been successfully reset. You can now log in to your account with your new password.</p>
      <a href="${data.loginLink}" class="btn">Login to Your Account</a>
      <div class="security-note">
        <h3>⚠️ Security Notice</h3>
        <p>If you did not make this change, please contact our support team immediately. Someone may have accessed your account.</p>
      </div>
    </div>
    <div class="footer">
      <p>This email was sent by 4LO4LO - Social Growth Platform</p>
      <p>If you have any questions, contact us at support@4lo4lo.site</p>
    </div>
  </div>
</body>
</html>
`;
}

function generatePlainTextPasswordResetConfirmation(data: PasswordResetConfirmationData): string {
  return `
PASSWORD RESET SUCCESSFUL

Hi ${data.username},

Your password has been successfully reset. You can now log in to your account with your new password.

Login to your account: ${data.loginLink}

SECURITY NOTICE:
If you did not make this change, please contact our support team immediately. Someone may have accessed your account.

---
4LO4LO - Social Growth Platform
support@4lo4lo.site
`;
}

function generateWelcomeEmailHTML(data: WelcomeEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to 4LO4LO</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    .logo {
      font-size: 42px;
      font-weight: 900;
      letter-spacing: 2px;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .header-subtitle {
      font-size: 16px;
      opacity: 0.95;
      font-weight: 300;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #4a5568;
      margin-bottom: 30px;
    }
    .info-box {
      background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
      border-left: 4px solid #667eea;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .info-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #718096;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .info-value {
      font-size: 18px;
      font-weight: 700;
      color: #667eea;
      word-break: break-all;
    }
    .referral-link {
      background-color: #667eea;
      color: white !important;
      padding: 12px 20px;
      text-decoration: none;
      border-radius: 6px;
      display: inline-block;
      margin-top: 10px;
      font-weight: 600;
      transition: background-color 0.3s;
    }
    .referral-link:hover {
      background-color: #5568d3;
    }
    .features {
      margin: 30px 0;
    }
    .feature-item {
      display: flex;
      align-items: start;
      margin-bottom: 20px;
      padding: 15px;
      background: #f7fafc;
      border-radius: 8px;
    }
    .feature-icon {
      font-size: 24px;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .feature-text {
      flex: 1;
    }
    .feature-title {
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 5px;
    }
    .feature-description {
      font-size: 14px;
      color: #718096;
      line-height: 1.5;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 16px;
      margin: 20px 0;
      text-align: center;
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
      transition: all 0.3s;
    }
    .cta-button:hover {
      box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
      transform: translateY(-2px);
    }
    .footer {
      background-color: #2d3748;
      color: #cbd5e0;
      padding: 30px 20px;
      text-align: center;
      font-size: 13px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-link {
      display: inline-block;
      margin: 0 10px;
      color: #cbd5e0;
      text-decoration: none;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">4LO4LO</div>
      <div class="header-subtitle">Social Growth Platform</div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">Welcome, ${data.username}! 🎉</div>
      
      <div class="message">
        <p>We're thrilled to have you join our community of social media enthusiasts! Your account has been successfully created, and you're ready to start earning rewards by completing simple social media tasks.</p>
      </div>

      <!-- User Info -->
      <div class="info-box">
        <div class="info-label">Your Username</div>
        <div class="info-value">${data.username}</div>
      </div>

      <div class="info-box">
        <div class="info-label">Your Referral Code</div>
        <div class="info-value">${data.referralCode}</div>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #718096;">Share this code with friends to earn rewards!</p>
      </div>

      <div class="info-box">
        <div class="info-label">Your Referral Link</div>
        <a href="${data.referralLink}" class="referral-link">${data.referralLink}</a>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #718096;">Share this link directly with friends!</p>
      </div>

      <!-- Getting Started Guide -->
      <div class="features">
        <h3 style="font-size: 20px; color: #2d3748; margin-bottom: 20px;">🚀 How to Get Started</h3>
        
        <div class="feature-item">
          <div class="feature-icon">1️⃣</div>
          <div class="feature-text">
            <div class="feature-title">Complete Tasks</div>
            <div class="feature-description">Browse available social media tasks and complete them to earn points. Each task comes with clear instructions!</div>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">2️⃣</div>
          <div class="feature-text">
            <div class="feature-title">Earn Points & Rewards</div>
            <div class="feature-description">Accumulate points for every task you complete. Reach milestones to unlock special rewards and bonuses!</div>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">3️⃣</div>
          <div class="feature-text">
            <div class="feature-title">Refer Friends</div>
            <div class="feature-description">Share your referral link with friends. When they join and complete tasks, you both earn rewards!</div>
          </div>
        </div>

        <div class="feature-item">
          <div class="feature-icon">4️⃣</div>
          <div class="feature-text">
            <div class="feature-title">Track Progress</div>
            <div class="feature-description">Monitor your points, level, and achievements in your personalized dashboard. Level up as you earn!</div>
          </div>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="https://4lo4lo.site/dashboard" class="cta-button">Start Earning Now →</a>
      </div>

      <!-- Tips -->
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <div style="font-weight: 700; color: #92400e; margin-bottom: 10px;">💡 Pro Tips</div>
        <ul style="margin: 0; padding-left: 20px; color: #78350f;">
          <li style="margin-bottom: 8px;">Complete tasks daily to maintain your streak and earn bonus points</li>
          <li style="margin-bottom: 8px;">The more referrals you bring, the more you earn - reach 20 referrals to unlock cash rewards!</li>
          <li style="margin-bottom: 8px;">Check the rewards page regularly for new milestones and special offers</li>
          <li>Join our community and engage with other members to maximize your earnings</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="logo" style="font-size: 28px; font-weight: 900; color: white; margin-bottom: 15px;">4LO4LO</div>
      
      <p style="margin: 15px 0;">Questions? We're here to help!</p>
      <p style="margin: 10px 0;">
        <a href="mailto:support@4lo4lo.site">support@4lo4lo.site</a>
      </p>
      
      <div class="social-links">
        <a href="https://4lo4lo.site" class="social-link">Website</a>
        <span style="color: #4a5568;">•</span>
        <a href="https://4lo4lo.site/promote-me" class="social-link">Promotions</a>
        <span style="color: #4a5568;">•</span>
        <a href="https://4lo4lo.site/rewards" class="social-link">Rewards</a>
      </div>

      <p style="margin-top: 25px; font-size: 12px; color: #a0aec0;">
        © 2025 4LO4LO. All rights reserved.<br>
        This email was sent to ${data.email}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generatePlainTextWelcome(data: WelcomeEmailData): string {
  return `
Welcome to 4LO4LO, ${data.username}!

We're thrilled to have you join our community of social media enthusiasts!

YOUR ACCOUNT DETAILS:
Username: ${data.username}
Referral Code: ${data.referralCode}
Referral Link: ${data.referralLink}

HOW TO GET STARTED:

1. Complete Tasks
   Browse available social media tasks and complete them to earn points.

2. Earn Points & Rewards
   Accumulate points for every task you complete. Reach milestones to unlock rewards!

3. Refer Friends
   Share your referral link with friends. When they join, you both earn rewards!

4. Track Progress
   Monitor your points, level, and achievements in your dashboard.

PRO TIPS:
• Complete tasks daily to maintain your streak
• Reach 20 referrals to unlock cash rewards
• Check the rewards page regularly for new milestones

Get started now: https://4lo4lo.site/dashboard

Questions? Contact us at support@4lo4lo.site

---
© 2025 4LO4LO. All rights reserved.
  `.trim();
}

function generatePasswordResetEmailHTML(data: PasswordResetEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    .logo {
      font-size: 42px;
      font-weight: 900;
      letter-spacing: 2px;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .header-subtitle {
      font-size: 16px;
      opacity: 0.95;
      font-weight: 300;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #4a5568;
      margin-bottom: 30px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 16px;
      margin: 20px 0;
      text-align: center;
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
      transition: all 0.3s;
    }
    .cta-button:hover {
      box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
      transform: translateY(-2px);
    }
    .warning-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .warning-text {
      font-size: 14px;
      color: #856404;
      margin: 0;
    }
    .footer {
      background-color: #2d3748;
      color: #cbd5e0;
      padding: 30px 20px;
      text-align: center;
      font-size: 13px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">4LO4LO</div>
      <div class="header-subtitle">Password Reset Request</div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">Hi ${data.username},</div>
      
      <div class="message">
        <p>We received a request to reset your password for your 4LO4LO account. Click the button below to create a new password:</p>
      </div>

      <!-- CTA Button - Table-based for email client compatibility -->
      <div style="text-align: center; margin: 30px 0;">
        <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td align="center" bgcolor="#667eea" style="border-radius: 8px;">
              <a href="${data.resetLink}" target="_blank" style="display: inline-block; padding: 16px 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">Reset Your Password</a>
            </td>
          </tr>
        </table>
      </div>

      <div class="message">
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;"><a href="${data.resetLink}" target="_blank" style="color: #667eea; font-size: 14px; text-decoration: underline;">${data.resetLink}</a></p>
      </div>

      <!-- Warning Box -->
      <div class="warning-box">
        <p class="warning-text"><strong>⚠️ Important:</strong> This password reset link will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
      </div>

      <div class="message">
        <p>For security reasons, we recommend:</p>
        <ul style="color: #4a5568; line-height: 1.8;">
          <li>Using a strong, unique password</li>
          <li>Not reusing passwords from other sites</li>
          <li>Enabling two-factor authentication when available</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="logo" style="font-size: 28px; font-weight: 900; color: white; margin-bottom: 15px;">4LO4LO</div>
      
      <p style="margin: 15px 0;">Questions? We're here to help!</p>
      <p style="margin: 10px 0;">
        <a href="mailto:support@4lo4lo.site">support@4lo4lo.site</a>
      </p>

      <p style="margin-top: 25px; font-size: 12px; color: #a0aec0;">
        © 2025 4LO4LO. All rights reserved.<br>
        This email was sent to ${data.email}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generatePlainTextPasswordReset(data: PasswordResetEmailData): string {
  return `
Reset Your 4LO4LO Password

Hi ${data.username},

We received a request to reset your password for your 4LO4LO account.

Click the link below to create a new password:
${data.resetLink}

IMPORTANT:
⚠️ This password reset link will expire in 1 hour.
⚠️ If you didn't request this password reset, please ignore this email.

For security reasons, we recommend:
• Using a strong, unique password
• Not reusing passwords from other sites
• Enabling two-factor authentication when available

Questions? Contact us at support@4lo4lo.site

---
© 2025 4LO4LO. All rights reserved.
  `.trim();
}

export interface BulkEmailData {
  subject: string;
  htmlContent: string;
  textContent?: string;
  recipients: Array<{ email: string; username: string }>;
}

export async function sendBulkEmail(data: BulkEmailData): Promise<{ success: number; failed: number; errors: string[] }> {
  const transporter: Transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || "9a685a001@smtp-brevo.com",
      pass: process.env.EMAIL_PASSWORD || "",
    },
    tls: {
      rejectUnauthorized: false,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  const wrapHtmlContent = (html: string, username: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px 20px;
      text-align: center;
      color: white;
    }
    .logo {
      font-size: 36px;
      font-weight: 900;
      letter-spacing: 2px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .content {
      padding: 30px;
      color: #4a5568;
      line-height: 1.6;
    }
    .content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    .footer {
      background-color: #2d3748;
      color: #cbd5e0;
      padding: 20px;
      text-align: center;
      font-size: 12px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">4LO4LO</div>
    </div>
    <div class="content">
      ${html}
    </div>
    <div class="footer">
      <p style="margin: 0 0 10px 0;">© 2025 4LO4LO. All rights reserved.</p>
      <p style="margin: 0;"><a href="https://4lo4lo.site">Visit our website</a> | <a href="mailto:support@4lo4lo.site">Contact Support</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();

  for (const recipient of data.recipients) {
    try {
      const personalizedHtml = wrapHtmlContent(
        data.htmlContent.replace(/\{\{username\}\}/g, recipient.username),
        recipient.username
      );
      const personalizedText = data.textContent?.replace(/\{\{username\}\}/g, recipient.username) || '';

      await transporter.sendMail({
        from: '"4LO4LO - Social Growth Platform" <noreply@4lo4lo.site>',
        to: `${recipient.username} <${recipient.email}>`,
        subject: data.subject.replace(/\{\{username\}\}/g, recipient.username),
        html: personalizedHtml,
        text: personalizedText,
      });
      
      success++;
      console.log(`✅ Bulk email sent to ${recipient.email}`);
    } catch (error: any) {
      failed++;
      errors.push(`Failed to send to ${recipient.email}: ${error.message}`);
      console.error(`❌ Failed to send bulk email to ${recipient.email}:`, error.message);
    }
  }

  transporter.close();
  return { success, failed, errors };
}
