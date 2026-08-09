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
  seo.ts          Canonical URLs, Open Graph, JSON-LD helpers
  tools-registry.ts   Free tool definitions, drives /free-tools
  learn-content.ts    Guide articles for /learn (source, not database)
  classroom-public.ts Public view of classroom_videos
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
Management section edits, it does **not** grant access. If an operator exists
only in `admins`, they cannot sign in; `/api/admin/login` detects this and
returns a 409 pointing at
[`scripts/sql/002-link-legacy-admins.sql`](scripts/sql/002-link-legacy-admins.sql).

Consolidating these two systems is the main outstanding piece of tech debt.

The admin area is protected in two places, deliberately:

1. `middleware.ts`, server-side, rejects non-admins before any HTML is sent.
2. `lib/admin-protected-route.tsx`, client-side, prevents content flashing and
   handles a session that expires mid-visit.

API routes protect themselves independently via `lib/auth-helpers.ts`.

### Public content and SEO

Three public surfaces exist to be found in search, and all three are server
rendered:

- `/free-tools/*` from `lib/tools-registry.ts`
- `/learn/*` guides from `lib/learn-content.ts`, kept in source so they are
  version controlled and build statically
- `/learn/lessons/<id>` from the `classroom_videos` table

Classroom lessons are public at the metadata and transcript level for every
published lesson, because that text is what search engines can index. The
video only plays for lessons in the free set, and the video URL is withheld
from the HTML for the rest, so the gate is real rather than cosmetic. Which
lessons are free is configured in `app_settings.classroom_free_lesson_ids`,
not in the schema, so it needs no migration. The default is the first three by
display order. See
[`scripts/sql/005-classroom-free-lessons.sql`](scripts/sql/005-classroom-free-lessons.sql).

To add a guide, add an entry to `lib/learn-content.ts`. The hub, the metadata,
the sitemap and the cross-links all derive from that array.

**Anything that reads the database from a public page imports `db` lazily
inside a try block.** `lib/db.ts` throws when DATABASE_URL is missing, and a
module-scope import throws during module evaluation, before any handler runs.
That takes down pages whose content does not need the database at all, which
is how `/learn` and `/sitemap.xml` both briefly 500'd.

### Realtime

`/api/sse` is a Server-Sent Events stream. The subscriber is taken **from the
session**, never from a query parameter. `contexts/WebSocketContext.tsx` is the
client (the name is historical, the transport is SSE).

---

## Deployment: Vercel

This deploys to Vercel serverless (project `4lo4lo-0-2`, team `surpluslink`).
Several things behave differently there than on a persistent host, and the
code accounts for them:

**Database connections.** Each concurrent lambda instance keeps its own pool.
`lib/db.ts` therefore caps at **2 connections per instance** on serverless
(10 elsewhere), because the old limit of 10 meant ~20 concurrent instances
could exhaust a typical MySQL `max_connections` of 100-151. Override with
`DB_CONNECTION_LIMIT` if you know your numbers. TCP keepalive is disabled on
serverless, a frozen instance cannot send probes, so MySQL closes the socket
and the pool hands out a dead connection. If you outgrow this, use a
connection proxy (PlanetScale, ProxySQL) rather than a bigger pool.

**Never cache per-instance state that affects correctness.** Each instance has
its own memory, so a `NodeCache` entry is stale independently on every one of
them. A cache on task completion counts previously let `maxCompletions` be
enforced against five-minute-old numbers; it was removed.

**Realtime is cycled, not persistent.** An open SSE stream pins an invocation,
so `/api/sse` closes itself after 45s and signals the client to reconnect.
Left unbounded it hit the 300-second platform timeout, the most frequent
runtime error on the project. Note also that `lib/sse.ts` keeps its client
set **in instance memory**, so a broadcast only reaches clients connected to
that same instance. Realtime is therefore best-effort today; a hosted pub/sub
service (Ably, Pusher, Supabase Realtime) is the real fix.

**File uploads** go to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set
(Storage → Blob in the dashboard connects it automatically). The filesystem is
read-only apart from `/tmp`, so the old `public/uploads` write failed with
`EROFS`. Without a blob store the route returns a clear 501 rather than a
stack trace. Locally it still writes to `public/uploads`.

**Rate limiting is per-instance and therefore approximate.** `lib/rate-limit.ts`
holds counters in instance memory, so the effective limit is roughly
`limit × instances`. It stops the simple scripted loop but is not a hard
guarantee. Provision Upstash Redis and swap the `Map` inside `check()`, it is
the only function that touches the store.

---

## Known limitations

- `app/admin/page.tsx` is still ~2,500 lines. Navigation and the standalone
  panels have been extracted; the per-section content has not, so the whole
  admin bundle still loads on first visit. Splitting each section into
  `app/admin/[section]/` is the next step.
- No automated tests. The points economy (task completion, referral rewards,
  payouts) is the highest-value place to start.
- No error monitoring. Wire up Sentry or equivalent, several endpoints were
  404ing in production with nothing reporting it.
- `scripts/sql/001-user-tasks-unique.sql` has not been applied. Until it is,
  duplicate task completions remain possible under concurrency.
- `scripts/sql/003-indexes.sql` has not been applied. The aggregate queries
  that replaced the full-table loads want an index on `user_tasks(task_id)`.
- Run `npm run db:check` first, it reports what 001 and 002 still need.
