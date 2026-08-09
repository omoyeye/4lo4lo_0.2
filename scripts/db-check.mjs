#!/usr/bin/env node
/**
 * Read-only production preflight.
 *
 * Runs the diagnostic queries from scripts/sql/001 and 002 and prints what
 * they mean. Issues SELECT statements only — no INSERT, UPDATE, DELETE or DDL
 * appears anywhere in this file, so it is safe to run against live data.
 *
 * Usage:
 *   node scripts/db-check.mjs
 *
 * Reads DATABASE_URL from .env (or the environment).
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const RED = "\x1b[31m";
const YEL = "\x1b[33m";
const GRN = "\x1b[32m";
const DIM = "\x1b[2m";
const BLD = "\x1b[1m";
const RST = "\x1b[0m";

function heading(text) {
  console.log(`\n${BLD}${text}${RST}\n${"─".repeat(text.length)}`);
}

function ok(msg) {
  console.log(`${GRN}✓${RST} ${msg}`);
}
function warn(msg) {
  console.log(`${YEL}!${RST} ${msg}`);
}
function bad(msg) {
  console.log(`${RED}✗${RST} ${msg}`);
}
function note(msg) {
  console.log(`${DIM}  ${msg}${RST}`);
}

const actions = [];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    bad("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  let conn;
  try {
    conn = await mysql.createConnection(url);
  } catch (err) {
    bad(`Could not connect: ${err.message}`);
    process.exit(1);
  }

  const [[{ db }]] = await conn.query("SELECT DATABASE() AS db");
  console.log(`${DIM}Connected to:${RST} ${BLD}${db}${RST}`);
  console.log(
    `${DIM}This script only reads. Nothing below modifies your data.${RST}`
  );

  // ── 001: duplicate task completions ──────────────────────────────────────
  heading("001 — Duplicate task completions");

  const [dupes] = await conn.query(`
    SELECT user_id, task_id, COUNT(*) AS copies,
           SUM(points_earned) AS points_total
    FROM   user_tasks
    GROUP  BY user_id, task_id
    HAVING COUNT(*) > 1
    ORDER  BY copies DESC
  `);

  const [[{ already }]] = await conn.query(`
    SELECT COUNT(*) AS already
    FROM   information_schema.statistics
    WHERE  table_schema = DATABASE()
      AND  table_name   = 'user_tasks'
      AND  index_name   = 'uq_user_tasks_user_task'
  `);

  if (already > 0) {
    ok("Unique index uq_user_tasks_user_task is already applied. Nothing to do.");
  } else if (dupes.length === 0) {
    ok("No duplicate completions found.");
    note("STEP 2 can be skipped entirely. Go straight to STEP 3:");
    note("ALTER TABLE user_tasks");
    note("  ADD CONSTRAINT uq_user_tasks_user_task UNIQUE (user_id, task_id);");
    actions.push("Apply STEP 3 of scripts/sql/001-user-tasks-unique.sql (safe — no duplicates exist)");
  } else {
    const extraRows = dupes.reduce((n, r) => n + (r.copies - 1), 0);
    const extraPoints = dupes.reduce(
      (n, r) => n + Math.round((r.points_total * (r.copies - 1)) / r.copies),
      0
    );
    bad(`${dupes.length} (user, task) pairs have duplicate completions.`);
    note(`${extraRows} extra rows, roughly ${extraPoints} points over-awarded.`);
    console.log();
    console.log(`  ${DIM}user_id  task_id  copies${RST}`);
    for (const r of dupes.slice(0, 15)) {
      console.log(
        `  ${String(r.user_id).padEnd(8)} ${String(r.task_id).padEnd(8)} ${r.copies}`
      );
    }
    if (dupes.length > 15) note(`… and ${dupes.length - 15} more`);
    console.log();
    warn("STEP 3 will FAIL until these are resolved — that is intentional.");
    note("Decide first: do you claw back the extra points, or absorb them?");
    note("Deleting the rows does NOT adjust users.points either way.");
    actions.push(
      `Resolve ${dupes.length} duplicate completions (STEP 2 of 001), then apply STEP 3`
    );
  }

  // ── 002: the two identity systems ────────────────────────────────────────
  heading("002 — Admin access");

  const [admins] = await conn.query(`
    SELECT id, username, email, role FROM users
    WHERE role IN ('admin','superadmin') ORDER BY role, id
  `);

  if (admins.length === 0) {
    bad("No user has role 'admin' or 'superadmin'.");
    note("Nobody can access the admin panel. This must be fixed before deploy.");
    actions.push("Promote a user to superadmin (STEP 3 of scripts/sql/002-link-legacy-admins.sql)");
  } else {
    ok(`${admins.length} user(s) can access the admin panel:`);
    for (const a of admins) {
      console.log(`    #${a.id}  ${a.username.padEnd(20)} ${a.role}`);
    }
    const supers = admins.filter((a) => a.role === "superadmin");
    if (supers.length === 0) {
      warn("None of them are superadmin.");
      note("Superadmin-only areas (Admins, promotion requests) will be locked.");
      actions.push("Promote at least one user to superadmin (STEP 3 of 002)");
    }
  }

  // Legacy admins table may not exist on every deployment.
  let legacy = [];
  try {
    [legacy] = await conn.query(`
      SELECT a.id, a.username, a.email, a.role,
             u.id AS user_id, u.role AS user_role
      FROM   admins a
      LEFT   JOIN users u ON u.username = a.username OR u.email = a.email
    `);
  } catch {
    note("No `admins` table on this database — nothing to reconcile.");
  }

  if (legacy.length) {
    const unlinked = legacy.filter((r) => r.user_id === null);
    const unpromoted = legacy.filter(
      (r) => r.user_id !== null && !["admin", "superadmin"].includes(r.user_role)
    );

    console.log();
    if (unlinked.length === 0 && unpromoted.length === 0) {
      ok(`All ${legacy.length} legacy admin(s) map to a user with admin access.`);
    }
    if (unlinked.length) {
      bad(`${unlinked.length} legacy admin(s) have NO user account and cannot sign in:`);
      for (const r of unlinked) {
        console.log(`    ${r.username.padEnd(20)} ${r.email ?? ""}`);
      }
      note("They must register normally, then be promoted. Do not copy hashes.");
      actions.push(`Create user accounts for ${unlinked.length} unlinked legacy admin(s)`);
    }
    if (unpromoted.length) {
      warn(`${unpromoted.length} legacy admin(s) have a user account that is not promoted:`);
      for (const r of unpromoted) {
        console.log(
          `    ${r.username.padEnd(20)} user #${r.user_id} is '${r.user_role}', admins says '${r.role}'`
        );
      }
      note("Fix with STEP 3 of 002, one user at a time.");
      actions.push(`Promote ${unpromoted.length} user(s) to match their admins-table role`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  heading("What to do next");
  if (actions.length === 0) {
    ok("Nothing outstanding. Both scripts are already satisfied.");
  } else {
    actions.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
    console.log();
    note("Take a backup before running any of the write steps.");
  }
  console.log();

  await conn.end();
}

main().catch((err) => {
  bad(`Preflight failed: ${err.message}`);
  process.exit(1);
});
