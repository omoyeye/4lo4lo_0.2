# Legacy PostgreSQL migrations — NOT the live schema

These files are kept for history only. **They do not describe the production
database and must never be applied to it.**

Why they were archived:

- `meta/_journal.json` declares `"dialect": "postgresql"`, but the application
  runs on MySQL (`lib/db.ts` uses `mysql2`, `drizzle.config.ts` uses
  `dialect: "mysql"`).
- The SQL file creates **22** tables. `shared/schema.mysql.ts` defines **36**.
  Fourteen tables — including `badges`, `user_badges`, `referral_tiers`,
  `point_listings`, `listing_comments`, `profile_links`, `shortened_urls`,
  `qr_email_leads` and `ad_placements` — have no migration at all.
- They were generated from `shared/schema.ts`, a PostgreSQL schema that has
  since been deleted because nothing imported it any more.

The live database is therefore **ahead of** and **incompatible with** this
history. Running `drizzle-kit push` or `migrate` with these files present
risks destructive DDL against production data.

## Re-baselining against the live MySQL database

Do this from a maintenance window, and take a backup first.

1. Snapshot the database (your provider's backup, or `mysqldump`).
2. Read the live schema — `introspect` only reads, it never writes:

```bash
npx drizzle-kit introspect
```

3. Diff the generated output against `shared/schema.mysql.ts`. Reconcile any
   differences **in the TypeScript file**, so the code matches reality.
4. Generate a baseline migration and mark it as already applied, so Drizzle
   does not try to create tables that already exist:

```bash
npx drizzle-kit generate --name baseline
```

5. Only after the baseline is recorded should you generate and apply new
   migrations normally.

Never run `drizzle-kit push` against production — it diffs and applies DDL
without a review step, which is how columns get dropped.
