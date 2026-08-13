#!/usr/bin/env node
/**
 * Create or promote a superadmin.
 *
 * WHY THIS EXISTS: there is no usable seeded superadmin. lib/core/storage.ts
 * carries a hardcoded 'admin' account, but its hash uses a colon separator
 * (hash:salt) while comparePasswords in auth.ts splits on a dot and rejects
 * anything without one, so it can never authenticate. It also lives in
 * MemStorage, which is not the active storage layer. Treat it as dead code.
 *
 * Passwords in this app are scrypt, stored as `${hex64}.${hexSalt}`. You
 * cannot INSERT a plaintext password and have login work, which is the trap
 * this script exists to avoid.
 *
 * Usage
 *   node scripts/create-superadmin.mjs            prompts, hidden input
 *   node scripts/create-superadmin.mjs --sql-only prints SQL, no DB write
 *
 * The password is read from a hidden prompt. It is never taken from a command
 * line argument, because that would put it in your shell history and in the
 * process list.
 */

import { scrypt as _scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import readline from "node:readline";
import "dotenv/config";

const scrypt = promisify(_scrypt);

/** Must match hashPassword() in auth.ts exactly, or login will fail. */
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scrypt(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Input handling.
 *
 * Interactive terminals get real prompts, with the password masked.
 *
 * When stdin is a pipe there is no terminal to mask and, more importantly,
 * opening a second readline interface after the first closes never resolves,
 * so the script would hang and exit silently. Piped input is therefore read
 * once up front and consumed line by line. That also makes the script
 * scriptable, e.g. printf 'pw\npw\n' | npm run admin:create -- --id=6 --sql-only
 */
const interactive = Boolean(process.stdin.isTTY);

let pipedLines = [];
async function loadPipedInput() {
  if (interactive) return;
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  pipedLines = Buffer.concat(chunks).toString("utf8").split(/\r?\n/);
}

function nextPipedLine() {
  return (pipedLines.shift() ?? "").trim();
}

function ask(question) {
  if (!interactive) {
    const value = nextPipedLine();
    process.stdout.write(question + "\n");
    return Promise.resolve(value);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

/** Prompt without echoing the typed characters. */
function askHidden(question) {
  if (!interactive) {
    const value = nextPipedLine();
    process.stdout.write(question + "\n");
    return Promise.resolve(value);
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (char) => {
      const c = char.toString();
      if (c === "\n" || c === "\r" || c === "") {
        process.stdin.removeListener("data", onData);
      } else {
        // Repaint the prompt so the typed characters never appear.
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(question);
      }
    };
    process.stdin.on("data", onData);
    rl.question(question, (a) => {
      process.stdin.removeListener("data", onData);
      rl.close();
      process.stdout.write("\n");
      resolve(a);
    });
  });
}

const sqlOnly = process.argv.includes("--sql-only");

/**
 * Optional --id=N.
 *
 * Prefer this over a username whenever you know the id, because the name shown
 * in the UI is display_name, not username. An UPDATE keyed on the displayed
 * name matches zero rows and looks like a silent failure.
 * /api/admin/diagnose reports the id exactly.
 */
const idArg = process.argv.find((a) => a.startsWith("--id="));
const targetId = idArg ? parseInt(idArg.split("=")[1], 10) : null;
if (idArg && !Number.isFinite(targetId)) {
  console.error("--id must be a number, e.g. --id=6");
  process.exit(1);
}

const RED = "\x1b[31m", GRN = "\x1b[32m", YEL = "\x1b[33m", DIM = "\x1b[2m", B = "\x1b[1m", R = "\x1b[0m";

async function main() {
  await loadPipedInput();
  console.log(`${B}Create or promote a superadmin${R}\n`);

  let username = "";
  if (targetId === null) {
    username = await ask("Username (existing account): ");
    if (!username) { console.error(`${RED}Username is required.${R}`); process.exit(1); }
  } else {
    console.log(`${DIM}Targeting user id ${targetId}.${R}\n`);
  }

  const password = await askHidden("Password (hidden, min 8 chars): ");
  if (!password || password.length < 8) {
    console.error(`${RED}Password must be at least 8 characters.${R}`);
    process.exit(1);
  }
  const confirm = await askHidden("Confirm password: ");
  if (password !== confirm) { console.error(`${RED}Passwords do not match.${R}`); process.exit(1); }

  const hash = await hashPassword(password);

  if (sqlOnly) {
    const where =
      targetId !== null
        ? `id = ${targetId}`
        : `username = ${JSON.stringify(username).replace(/"/g, "'")}`;

    console.log(`\n${B}Review, then run against your database:${R}\n`);
    console.log(`UPDATE users SET role = 'superadmin', password = '${hash}'`);
    console.log(`WHERE ${where} LIMIT 1;\n`);
    console.log(`${DIM}-- Verify it matched exactly one row:${R}`);
    console.log(`SELECT id, username, role FROM users WHERE ${where};`);

    if (targetId === null) {
      console.log(
        `\n${YEL}If that UPDATE reports 0 rows changed, the username is wrong.${R} ` +
        `The name shown in the UI is display_name. Get your id from ` +
        `/api/admin/diagnose and re-run with --id=<id>.`
      );
    }
    console.log(
      `\n${YEL}Then sign out and back in.${R} The role is carried inside the session ` +
      `token, so an existing session keeps the old role until it is reissued.`
    );
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error(`\n${RED}DATABASE_URL is not set.${R} Add it to .env, or re-run with --sql-only to print the statement instead.`);
    process.exit(1);
  }

  const mysql = (await import("mysql2/promise")).default;
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const lookupSql =
      targetId !== null
        ? "SELECT id, username, role FROM users WHERE id = ? LIMIT 1"
        : "SELECT id, username, role FROM users WHERE username = ? LIMIT 1";
    const lookupArg = targetId !== null ? targetId : username;

    const [rows] = await conn.execute(lookupSql, [lookupArg]);

    if (rows.length > 0) {
      const user = rows[0];
      console.log(`\nFound user #${user.id} (${user.username}), current role: ${user.role}`);
      const go = await ask("Set password and promote to superadmin? (yes/no): ");
      if (go.toLowerCase() !== "yes") { console.log("Aborted. Nothing changed."); return; }

      await conn.execute(
        "UPDATE users SET role = 'superadmin', password = ? WHERE id = ? LIMIT 1",
        [hash, user.id]
      );
      console.log(`${GRN}Updated.${R} User #${user.id} is now superadmin.`);
    } else {
      console.log(
        targetId !== null
          ? `\nNo user with id ${targetId} exists.`
          : `\nNo user named ${JSON.stringify(username)} exists.`
      );
      console.log(
        `${YEL}This script does not create new user rows.${R} The users table has required columns ` +
        `(referral_code and others) whose values are business data, and guessing them here would ` +
        `produce a half-formed account.`
      );
      console.log(`\nSign up through the normal flow at /signup, then re-run this script to promote that account.`);
      return;
    }

    const [check] = await conn.execute(lookupSql, [lookupArg]);
    console.log("\nVerified:", check[0]);
    console.log(`\n${YEL}Sign out and back in.${R} The role is carried inside the session token, so an existing session keeps the old role until it is reissued.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(`${RED}Failed:${R}`, err.message);
  process.exit(1);
});
