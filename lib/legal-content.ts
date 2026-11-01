/**
 * Terms of Service and Privacy Policy text: the single source.
 *
 * Rendered by app/terms, app/privacy (components/legal/LegalDoc.tsx) and,
 * as an identical copy at src/lib/legal-content.ts, by the mobile app. When
 * you change this file, copy it to the mobile repo too.
 *
 */

import { DEFAULT_BRAND, type BrandProfile } from "./brand-defaults";

export type Block =
  | { p: string }
  | { list: string[] }
  | { h: string }
  | { danger: true; title: string; blocks: Block[] };

export interface LegalSection {
  title: string;
  blocks: Block[];
}

export const LEGAL_UPDATED = "November 1, 2026";

/**
 * Company details come from the brand profile (Admin → Brand), so the legal
 * name, postal address and support email shown here match the emails and
 * footers. Data protection law (GDPR Art. 13, NDPA s.27) requires the
 * controller's identity and contact details: fill them in there.
 */
function companyFrom(b: BrandProfile) {
  const COMPANY = { brand: b.name, legalName: b.legalName, postalAddress: b.postalAddress || null, email: b.supportEmail, website: "https://4lo4lo.site" };
  const operator = `${COMPANY.legalName}${COMPANY.postalAddress ? `, ${COMPANY.postalAddress}` : ""}`;
  return { COMPANY, operator };
}

/* ───────────────────────────── Terms of Service ───────────────────────────── */

export function termsSections(brand: BrandProfile = DEFAULT_BRAND): LegalSection[] {
  const { COMPANY, operator } = companyFrom(brand);
  return [
  {
    title: "1. Who we are and these Terms",
    blocks: [
      { p: `These Terms of Service ("Terms") are an agreement between you and ${operator} ("${COMPANY.brand}", "we", "us"), the operator of 4lo4lo.site and the ${COMPANY.brand} mobile apps (together, the "Platform").` },
      { p: "By creating an account or using the Platform you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the Platform." },
    ],
  },
  {
    title: "2. Eligibility",
    blocks: [
      {
        list: [
          "You must be at least 18 years old. We do not knowingly allow anyone under 18 to register, and we close accounts we find belong to minors.",
          "You must be able to enter into a binding contract and must not be barred from using the Platform under the laws that apply to you.",
          "One account per person. Creating or controlling more than one account, including through family members or shared devices, is not allowed.",
          "The information you give us, including your email address, must be accurate and kept up to date.",
        ],
      },
    ],
  },
  {
    title: "3. What the Platform offers",
    blocks: [
      { p: `${COMPANY.brand} is a community for content creators. Members can:` },
      {
        list: [
          "complete social media tasks (for example following, liking, commenting on or watching content) to earn points;",
          "watch Classroom lessons, keep daily streaks, earn badges and refer friends for bonus points;",
          "use points or card payments to promote their own content (Promote Me);",
          "list points in the member Marketplace, appear on the leaderboard and in the community feed;",
          "request to withdraw points as money, as described in section 7.",
        ],
      },
      { p: "Features, rewards and point values may change. We will give reasonable notice of changes that reduce points you have already earned." },
    ],
  },
  {
    title: "4. Third-party social media platforms",
    blocks: [
      {
        danger: true,
        title: "Important: read before completing tasks",
        blocks: [
          { p: "Instagram, TikTok, YouTube, Facebook, X and other platforms have their own rules, and many restrict engagement that is rewarded or coordinated. Tasks on 4LO4LO involve real people choosing to engage with real content, but third-party platforms may still treat this as against their rules." },
          {
            list: [
              "You are responsible for complying with the rules of every platform you use.",
              "Third-party platforms may limit, suspend or remove accounts or engagement. We cannot control or reverse that, and we are not liable for it.",
              "Only engage with content you are genuinely willing to interact with, using your own real account.",
            ],
          },
        ],
      },
    ],
  },
  {
    title: "5. Your account",
    blocks: [
      { list: [
        "Keep your password private. You are responsible for activity on your account.",
        "Tell us straight away at " + COMPANY.email + " if you think someone else has accessed your account.",
        "You can delete your account at any time in Settings (website or app). See section 12 for what happens to your points.",
      ] },
    ],
  },
  {
    title: "6. Rules of conduct",
    blocks: [
      { p: "You must not:" },
      {
        list: [
          "use bots, scripts, emulators, VPN farms or any automation to complete tasks or create accounts;",
          "submit edited, borrowed or reused screenshots as proof, or claim a task you did not genuinely complete;",
          "undo engagement (unfollow, unlike, delete a comment) after being rewarded for it;",
          "refer yourself, create accounts to collect referral or sign-up bonuses, or trade accounts;",
          "harass, threaten or spam other members, or post unlawful, hateful, sexual or misleading content;",
          "promote content that is illegal, infringes others' rights, or that you do not have permission to promote;",
          "try to break, overload or gain unauthorised access to the Platform.",
        ],
      },
      { p: "We use automated signals (such as accounts sharing a device or network) to flag possible abuse. Flags are reviewed by a person before we take action on an account." },
    ],
  },
  {
    title: "7. Points, rewards and withdrawals",
    blocks: [
      {
        list: [
          "Points are a reward unit. They are not money, a bank deposit or a security, and they have no cash value until a withdrawal you request is approved and paid.",
          "Some tasks require a screenshot proof. Points for those tasks show as \"in review\" and are added to your balance only when the proof is approved.",
          "To withdraw you must have a confirmed email address, meet the minimum withdrawal shown on the Payments page, and have no other withdrawal in progress. Points are held when you request a withdrawal and returned if it is declined.",
          "We convert points at the rate published on the Platform at the time of payment. Payments are made by the methods offered (currently PayPal or bank transfer) and usually take 1 to 7 business days after approval. Payment providers may charge their own fees.",
          "We may review, delay or decline a withdrawal, and may remove points, if we reasonably believe they were earned in breach of these Terms. We will tell you why where the law allows.",
          "You are responsible for any taxes due on rewards you receive.",
          "Points cannot be transferred or sold outside the features the Platform provides.",
        ],
      },
    ],
  },
  {
    title: "8. Referrals",
    blocks: [
      { p: "You can earn rewards when people you invite join and take part. Referral rewards are only paid for genuine new members who are not you, and the referral terms shown on the Referral page (rates, tiers and minimums) apply. We may withhold referral rewards linked to fraudulent or duplicate accounts." },
    ],
  },
  {
    title: "9. Promote Me purchases and refunds",
    blocks: [
      {
        list: [
          "Promotion plans can be paid for with points or by card (processed by Stripe). Prices are shown before you pay.",
          "We aim to deliver the engagement described in your plan but cannot guarantee specific results, rankings or follower retention, which depend on the community and on third-party platforms.",
          "If we cannot start your promotion, or cancel it, you get a full refund to the original payment method (or your points back).",
          "If you are a consumer in the UK or EU you have a 14-day right to cancel a card purchase. By asking us to start the promotion straight away, you agree that once it is fully delivered you lose that right, and if you cancel part-way through you will be refunded for the part not yet delivered.",
          "Nothing in these Terms limits refund rights you have under the law of the country where you live.",
        ],
      },
    ],
  },
  {
    title: "10. Marketplace and community features",
    blocks: [
      { p: "The Marketplace, feed, profiles and comments let members interact with each other. Arrangements between members are between those members; we are not a party to them. We may remove listings, comments or profiles that break these Terms. Do not share bank details or passwords with other members." },
    ],
  },
  {
    title: "11. Your content",
    blocks: [
      { p: "You keep ownership of what you post (profile details, photos, bio, comments, proof screenshots). You give us a non-exclusive, worldwide, royalty-free licence to host, display and process that content only to run and improve the Platform, for example showing your profile to members or reviewing your proofs. The licence ends when you delete the content or your account, except for copies we must keep under section 12 of the Privacy Policy." },
    ],
  },
  {
    title: "12. Suspension, termination and account deletion",
    blocks: [
      {
        list: [
          "You can delete your account at any time in Settings. Withdraw any points you want to keep first: unwithdrawn points, open Marketplace listings and withdrawals not yet approved end with the account.",
          "We may suspend or close accounts that break these Terms, are involved in fraud, or where the law requires it. Where reasonable we will warn you first and let you explain.",
          "If we close the Platform or your account without you being at fault, we will pay out any approved balance above the minimum withdrawal.",
        ],
      },
    ],
  },
  {
    title: "13. Disclaimers and limitation of liability",
    blocks: [
      { p: "We provide the Platform \"as is\". We do not promise it will always be available or error-free, or that you will earn a particular amount." },
      { p: "To the extent the law allows, we are not liable for indirect or consequential losses, for actions taken by third-party platforms against your accounts, or for losses caused by your breach of these Terms. Our total liability to you for any claim is limited to the greater of the amount you paid us in the 12 months before the claim and the value of your approved, unpaid withdrawals." },
      { p: "Nothing in these Terms excludes liability that cannot be excluded by law, such as liability for death or personal injury caused by negligence, or for fraud, and nothing affects your statutory rights as a consumer." },
    ],
  },
  {
    title: "14. Indemnity",
    blocks: [
      { p: "If you use the Platform for business purposes, you agree to cover our reasonable losses arising from content you post or your breach of these Terms or of third-party rules." },
    ],
  },
  {
    title: "15. Changes to these Terms",
    blocks: [
      { p: "We may update these Terms. For material changes we will notify you by email or in the app at least 14 days before they take effect. If you do not agree, you can delete your account before then; continuing to use the Platform after that date means you accept the new Terms." },
    ],
  },
  {
    title: "16. Governing law and disputes",
    blocks: [
      { p: "Please contact " + COMPANY.email + " first; most problems are solved quickly that way." },
      { p: "These Terms are governed by the laws of England and Wales, and the courts of England and Wales have jurisdiction. If you are a consumer, you also keep the protection of the mandatory laws of the country where you live and may bring a claim in your local courts." },
    ],
  },
  {
    title: "17. General",
    blocks: [
      { p: "If any part of these Terms is found unenforceable, the rest remains in force. We may transfer our rights under these Terms to a business that takes over the Platform; your rights will not be reduced. These Terms and the Privacy Policy are the whole agreement between you and us about the Platform." },
    ],
  },
  {
    title: "18. Contact",
    blocks: [
      { list: [`Email: ${COMPANY.email}`, `Website: ${COMPANY.website}`, ...(COMPANY.postalAddress ? [`Post: ${operator}`] : [])] },
    ],
  },
];
}

/* ───────────────────────────── Privacy Policy ───────────────────────────── */

export function privacySections(brand: BrandProfile = DEFAULT_BRAND): LegalSection[] {
  const { COMPANY, operator } = companyFrom(brand);
  return [
  {
    title: "1. Who is responsible for your data",
    blocks: [
      { p: `${operator} ("${COMPANY.brand}", "we", "us") is the data controller for personal data processed through 4lo4lo.site and the ${COMPANY.brand} apps. Contact us about privacy at ${COMPANY.email}.` },
      { p: "This policy explains what we collect, why, who we share it with, how long we keep it and your rights. The Platform is only for adults aged 18 and over." },
    ],
  },
  {
    title: "2. What we collect",
    blocks: [
      { h: "2.1 Information you give us" },
      {
        list: [
          "Account: username, email address, password (stored only as a salted hash), display name, country, and optionally a profile photo, bio and social media handles.",
          "Payout details: your PayPal email or bank details when you request a withdrawal.",
          "Task proofs: screenshots and notes you upload to show you completed a task.",
          "Content: community posts, comments and likes, Marketplace listings, profile links and support messages.",
          "Purchases: Promote Me orders. Card payments are handled by Stripe; we never see or store your full card number.",
        ],
      },
      { h: "2.2 Information collected automatically" },
      {
        list: [
          "Activity: tasks clicked and completed, points, streaks, badges, referrals, withdrawals and notifications.",
          "Device and security data: a random device identifier created by your browser or the app, a one-way (salted hash) version of your IP address, browser/app type and sign-in times. We use these to stop people running multiple accounts and to keep accounts secure.",
          "Push notification token, if you allow notifications in the app.",
          "Analytics: if you accept analytics cookies on the website, Google Analytics records pages visited and general device information. See section 9.",
        ],
      },
    ],
  },
  {
    title: "3. How we use it and our legal bases",
    blocks: [
      {
        list: [
          "To run your account and the Platform (tasks, points, proofs review, withdrawals, Promote Me, Marketplace, community features): necessary to perform our contract with you.",
          "To prevent fraud and abuse and keep the Platform secure (device checks, duplicate-account detection, admin sign-in codes, activity logs): our legitimate interest in protecting members and our business. People review fraud flags before we act; we do not make decisions about you based solely on automated processing.",
          "To send service emails and notifications (email confirmation, sign-in codes, password resets, payout updates, proof decisions): necessary to perform our contract.",
          "To send community announcements: our legitimate interest, and you can opt out at any time using the unsubscribe link or your notification settings.",
          "Website analytics: your consent, which you can withdraw at any time.",
          "To meet legal obligations, such as keeping payment and tax records and responding to lawful requests.",
        ],
      },
    ],
  },
  {
    title: "4. What other members can see",
    blocks: [
      { p: "Your username, display name, photo, level, points rank and badges appear on the leaderboard, in the feed and on your profile page. You can turn your profile page off in Settings. Your profile is only listed in search engines if you switch that on. Your email, payout details and proofs are never shown to other members." },
    ],
  },
  {
    title: "5. Who we share it with",
    blocks: [
      { p: "We do not sell your personal data or share it for targeted advertising. We share it only with:" },
      {
        list: [
          "Hosting and storage: Vercel (website hosting and image storage) and our database host (InterServer).",
          "Email delivery: our email provider, to send service and community emails.",
          "Payments: Stripe (card payments) and PayPal or banks (to pay your withdrawals).",
          "App notifications: Expo, Apple and Google, to deliver push notifications.",
          "Analytics: Google, only if you accept analytics cookies.",
          "Authorities or others where the law requires it, or to protect our members and rights; and a buyer of our business, who would have to honour this policy.",
        ],
      },
    ],
  },
  {
    title: "6. International transfers",
    blocks: [
      { p: "Our providers store and process data in the United States and other countries. Where data leaves the UK, EEA, Nigeria or another country with transfer rules, we rely on safeguards the law recognises, such as the providers' standard contractual clauses or adequacy decisions." },
    ],
  },
  {
    title: "7. How long we keep it",
    blocks: [
      {
        list: [
          "Account data: while your account is open.",
          "When you delete your account we immediately erase your name, email, password, photo, bio, social handles, profile links, notifications, device records and push tokens, and replace your username with \"Deleted user\".",
          "Task, referral, purchase and withdrawal records are kept in that anonymised form for up to 6 years for accounting, tax and fraud-prevention purposes.",
          "Proof screenshots: until the proof is reviewed and for as long as the account exists, then deleted with the account.",
          "Server logs: a few weeks. Email confirmation and admin sign-in codes expire within an hour.",
        ],
      },
    ],
  },
  {
    title: "8. Your rights",
    blocks: [
      { p: "Depending on where you live (including under the UK and EU GDPR, Nigeria's Data Protection Act 2023, South Africa's POPIA, Kenya's Data Protection Act, Brazil's LGPD and US state laws such as the CCPA), you have the right to:" },
      {
        list: [
          "access your data and get a copy (use \"Download my data\" in Settings, or email us);",
          "correct inaccurate data (most of it you can edit in Settings);",
          "delete your account and data (Settings → Account → Delete Account);",
          "object to or restrict certain processing, and opt out of community emails;",
          "withdraw consent for analytics at any time (Cookie Preferences in the website footer);",
          "not be discriminated against for using these rights;",
          "complain to your data protection authority, such as the UK ICO, your EU supervisory authority or the Nigeria Data Protection Commission.",
        ],
      },
      { p: `Email ${COMPANY.email} to use any right. We reply within one month and may need to confirm your identity.` },
    ],
  },
  {
    title: "9. Cookies and similar technologies",
    blocks: [
      { h: "Strictly necessary (always on)" },
      {
        list: [
          "authjs.session-token / authjs.csrf-token / authjs.callback-url: keep you signed in securely (up to 7 days).",
          "cookie_consent (local storage): remembers your cookie choice.",
          "4lo4lo.device (local storage): a random device identifier used only for security and duplicate-account checks.",
          "Preferences (local storage): theme, tutorial progress and daily check-in state.",
        ],
      },
      { h: "Analytics (only with your consent)" },
      { list: ["_ga, _ga_*: Google Analytics, to understand how the website is used (up to 2 years)."] },
      { p: "We do not use advertising or cross-site tracking cookies. Change your choice any time with \"Cookie Preferences\" in the footer; withdrawing consent stops analytics and removes the analytics cookies. The mobile app does not use cookies or analytics trackers." },
    ],
  },
  {
    title: "10. Emails",
    blocks: [
      { p: "Service emails (email confirmation, sign-in codes, password resets, payout and proof updates) are part of using the Platform. Community announcements include an unsubscribe link and can also be turned off under Settings → Notifications." },
    ],
  },
  {
    title: "11. Security",
    blocks: [
      { p: "We use encrypted connections (HTTPS), hashed passwords, emailed codes for admin sign-in, role-based admin permissions and logs of sensitive admin actions. No system is perfectly secure; if a breach puts your rights at risk, we will tell you and the relevant authority as the law requires." },
    ],
  },
  {
    title: "12. Children",
    blocks: [
      { p: "The Platform is not for anyone under 18. We do not knowingly collect data from minors and will delete an account if we learn it belongs to someone under 18. If you believe a minor has an account, contact " + COMPANY.email + "." },
    ],
  },
  {
    title: "13. Changes to this policy",
    blocks: [
      { p: "We will post any changes here and update the date at the top. For significant changes we will also tell you by email or in the app before they apply." },
    ],
  },
  {
    title: "14. Contact",
    blocks: [
      { list: [`Email: ${COMPANY.email}`, `Website: ${COMPANY.website}`, ...(COMPANY.postalAddress ? [`Post: ${operator}`] : [])] },
    ],
  },
];
}
