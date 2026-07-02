# Threat Model

## Project Overview

This application is a public social-media task platform with a React frontend, an Express API, PostgreSQL storage, Passport-based user sessions, a separate admin session model, Stripe checkout for promotions, email delivery, and WebSocket-driven notifications. The production deployment is publicly reachable, so all public routes and authenticated user routes must be treated as internet-exposed.

## Assets

- **User accounts and sessions** — usernames, emails, password hashes, OAuth-linked accounts, session cookies, and admin session state. Compromise enables account takeover or privilege escalation.
- **User business data** — points, payout requests, referral relationships, referral claims, milestone progress, notification history, and classroom/task activity. Exposure or tampering affects balances, rewards, and trust in the platform.
- **Admin capabilities** — user management, point adjustments, payout processing, promotion management, settings changes, ad placement management, and bulk messaging. Abuse of admin actions would impact the whole user base.
- **Payment and promotion records** — Stripe session IDs, promotion requests, payment state, and payout details. Tampering could lead to fraudulent approvals, unauthorized charges workflow changes, or disclosure of sensitive financial metadata.
- **Application secrets and operational data** — database connection strings, Stripe secrets, email credentials, and internal notifications. Exposure would enable deeper compromise.

## Trust Boundaries

- **Browser to API** — every request from the client is untrusted. Route params, body fields, and query strings such as `userId`, role hints, URLs, and content fields must be validated and authorized server-side.
- **User session to admin session** — the app uses `req.user` for normal users and `req.session.admin` for admin access. These are separate privilege domains and must never be confused.
- **API to PostgreSQL** — the API has broad authority over user, admin, payout, referral, promotion, and settings tables. Broken authorization at the route layer directly exposes database-backed records.
- **API to third parties** — Stripe webhooks, email delivery, Google OAuth, and any server-side callbacks are external-service trust boundaries that require strict verification.
- **Public versus authenticated versus admin surfaces** — public tools and profile routes are internet-accessible; user dashboards and account data require authentication; admin routes require explicit server-side admin enforcement.
- **Production versus dev-only code** — `server/storage.db.ts` is the production persistence path; `server/storage.ts` is primarily development fallback and should be ignored unless a production route can reach it.

## Scan Anchors

- **Production entry points** — `server/index.ts`, `server/routes.ts`, `server/auth.ts`
- **Highest-risk code areas** — admin/user authorization in `server/routes.ts`; persistence in `server/storage.db.ts`; schema-defined sensitive fields in `shared/schema.ts`; public tools/ad rendering in `client/src/pages/Tools.tsx` and `client/src/pages/FreeTools.tsx`
- **Public surfaces** — `/api/health`, public profile routes, short-link redirect `/s/:shortCode`, QR/shortener endpoints, promotion browsing endpoints
- **Authenticated surfaces** — `/api/user*`, dashboard/task/referral/payout/marketplace/classroom routes
- **Admin surfaces** — `/api/auth/admin/login` and `/api/admin/*`
- **Usually dev-only** — `server/storage.ts`, deployment helper scripts, local test artifacts, and backup/fix scripts unless imported into production code paths

## Threat Categories

### Spoofing

Attackers may try to impersonate users or admins by abusing weak session checks, confusing user and admin session state, or taking over accounts through password-reset or login flows. Every protected route must bind actions to the authenticated server-side identity, and admin actions must require a valid `req.session.admin` role check.

### Tampering

The client can submit task completions, payout requests, referral claims, promotion requests, profile updates, and admin-style operations with attacker-controlled identifiers. The system must calculate or verify ownership server-side and must never trust a browser-supplied `userId`, target record ID, or role value for permission decisions.

### Information Disclosure

This codebase stores sensitive user metadata including email addresses, referral codes, payout/payment details, progress history, and notification state. User-specific endpoints must return only the caller's own records unless an explicit admin check passes, and public endpoints must never expose private account fields or personalized cached responses.

### Denial of Service

Public and authenticated endpoints can trigger database work, email sends, task allocation, and link-shortening/QR tooling. Authentication, password-reset, and other public mutation endpoints need abuse resistance so attackers cannot cheaply flood operational resources or spam privileged workflows.

### Elevation of Privilege

The highest-risk failure mode is broken access control: unauthenticated access to admin endpoints, IDOR on user-scoped APIs, or cross-account state changes through caller-supplied IDs. The application must enforce role and ownership checks on every request path that reads or mutates user, admin, payout, referral, promotion, task, or settings data.