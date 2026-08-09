# 4lo4lo

Social-media task platform. Users complete tasks on connected platforms, earn
points, and redeem them for payouts, marketplace trades and promotion services.

**Stack:** Next.js 16 (App Router) · React 18 · TypeScript · NextAuth v5 ·
Drizzle ORM + MySQL · Tailwind + shadcn/ui

---

## ⚠️ This app runs against a live production database

Before touching anything schema-related, read
[`migrations/_legacy-postgres/README.md`](migrations/_legacy-postgres/README.md).

- **Never run `drizzle-kit push`.** It diffs the schema and applies DDL with no
  review step, which is how columns get dropped. The `db:push` script has been
  removed for this reason.
- Schema changes go through `db:generate` → review the SQL → `db:migrate`.
- Manual, reviewed DDL lives in [`scripts/sql/`](scripts/sql/) and is run by a
  human, never by the app.

---

## Getting started

```bash
npm install
cp .env.example .env   # then fill it in
npm run dev
```

Every variable the code reads is documented in
[`.env.example`](.env.example). At minimum you need `DATABASE_URL`,
`NEXTAUTH_SECRET` and `NEXTAUTH_URL`.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `start` | Production build and serve |
| `npm run check` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:introspect` | **Read-only.** Dumps the live schema. |
| `npm run db:generate` | Writes a migration file for review. Does not touch the DB. |
| `npm run db:migrate` | Applies reviewed migrations. |

---

## Architecture

```
app/
  api/            REST route handlers (~100). Auth enforced per-route.
  admin/          Admin panel: layout.tsx (chrome + guard), page.tsx (sections)
  <route>/        User-facing pages
components/
  admin/          Admin panels, nav definition, shell
  ui/             shadcn/ui primitives
  layout/         Sidebar, header, footer, mobile nav
lib/
  db.ts           The pooled MySQL connection. The only one.
  core/storage.ts IStorage interface
  core/storage.db.ts  DatabaseStorage implementation
  rate-limit.ts   In-process fixed-window limiter
  auth-helpers.ts requireAuth / requireAdmin / requireSuperadmin
shared/
  schema.mysql.ts The schema. Single source of truth for types.
scripts/sql/      Reviewed DDL, run manually against production
middleware.ts     Server-side gate for /admin/*
auth.ts           NextAuth config, password hashing, ADMIN_ROLES
```

### Authentication and authorization

Authorization is driven by **`users.role`** (`member` | `admin` | `superadmin`).
That is what `requireAdmin()`, `requireSuperadmin()`, `middleware.ts` and
`/api/admin/status` all read.

There is also a legacy **`admins` table**. It is a *directory* that the Admin
Management section edits — it does **not** grant access. If an operator exists
only in `admins`, they cannot sign in; `/api/admin/login` detects this and
returns a 409 pointing at
[`scripts/sql/002-link-legacy-admins.sql`](scripts/sql/002-link-legacy-admins.sql).

Consolidating these two systems is the main outstanding piece of tech debt.

The admin area is protected in two places, deliberately:

1. `middleware.ts` — server-side, rejects non-admins before any HTML is sent.
2. `lib/admin-protected-route.tsx` — client-side, prevents content flashing and
   handles a session that expires mid-visit.

API routes protect themselves independently via `lib/auth-helpers.ts`.

### Realtime

`/api/sse` is a Server-Sent Events stream. The subscriber is taken **from the
session**, never from a query parameter. `contexts/WebSocketContext.tsx` is the
client (the name is historical — the transport is SSE).

### Rate limiting

`lib/rate-limit.ts` is an in-process fixed-window limiter. It protects a single
Node process. **If you scale to more than one instance, replace the `Map` with
Redis** — the `rateLimit()` signature is designed so only that file changes.

### File uploads

`/api/admin/upload` writes to `public/uploads` on local disk. That works under
`next start` on a persistent host. **On a serverless platform the filesystem is
ephemeral and uploads will disappear** — move to S3/R2/Cloudinary first.

---

## Known limitations

- `app/admin/page.tsx` is still ~2,500 lines. Navigation and the standalone
  panels have been extracted; the per-section content has not, so the whole
  admin bundle still loads on first visit. Splitting each section into
  `app/admin/[section]/` is the next step.
- No automated tests. The points economy (task completion, referral rewards,
  payouts) is the highest-value place to start.
- No error monitoring. Wire up Sentry or equivalent — several endpoints were
  404ing in production with nothing reporting it.
- `scripts/sql/001-user-tasks-unique.sql` has not been applied. Until it is,
  duplicate task completions remain possible under concurrency.
