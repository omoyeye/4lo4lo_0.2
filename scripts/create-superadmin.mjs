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

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

/** Prompt without echoing to the terminal. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (char) => {
      const s = char.toString();
      if (s === "\n" || s === "\r" || s === "") {
        process.stdin.removeListener("data", onData);
      } else {
        // Repaint the prompt so the password is not shown.
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(question);
      }
    };
    process.stdin.on("data", onData);
    rl.question(question, (a) => { rl.close(); process.stdout.write("\n"); resolve(a); });
  });
}

const sqlOnly = process.argv.includes("--sql-only");

const RED = "\x1b[31m", GRN = "\x1b[32m", YEL = "\x1b[33m", DIM = "\x1b[2m", B = "\x1b[1m", R = "\x1b[0m";

async function main() {
  console.log(`${B}Create or promote a superadmin${R}\n`);

  const username = await ask("Username (existing or new): ");
  if (!username) { console.error(`${RED}Username is required.${R}`); process.exit(1); }

  const password = await askHidden("Password (hidden, min 8 chars): ");
  if (!password || password.length < 8) {
    console.error(`${RED}Password must be at least 8 characters.${R}`);
    process.exit(1);
  }
  const confirm = await askHidden("Confirm password: ");
  if (password !== confirm) { console.error(`${RED}Passwords do not match.${R}`); process.exit(1); }

  const hash = await hashPassword(password);

  if (sqlOnly) {
    console.log(`\n${B}Review, then run against your database:${R}\n`);
    console.log(`${DIM}-- Promote an existing account (preferred if the user already exists):${R}`);
    console.log(`UPDATE users SET role = 'superadmin', password = '${hash}'`);
    console.log(`WHERE username = ${JSON.stringify(username).replace(/"/g, "'")} LIMIT 1;\n`);
    console.log(`${DIM}-- Verify:${R}`);
    console.log(`SELECT id, username, role FROM users WHERE username = ${JSON.stringify(username).replace(/"/g, "'")};`);
    console.log(`\n${YEL}Then sign out and back in. The role lives in the session token, so an existing session keeps the old role.${R}`);
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error(`\n${RED}DATABASE_URL is not set.${R} Add it to .env, or re-run with --sql-only to print the statement instead.`);
    process.exit(1);
  }

  const mysql = (await import("mysql2/promise")).default;
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [rows] = await conn.execute(
      "SELECT id, username, role FROM users WHERE username = ? LIMIT 1",
      [username]
    );

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
      console.log(`\nNo user named ${JSON.stringify(username)} exists.`);
      console.log(
        `${YEL}This script does not create new user rows.${R} The users table has required columns ` +
        `(referral_code and others) whose values are business data, and guessing them here would ` +
        `produce a half-formed account.`
      );
      console.log(`\nSign up through the normal flow at /signup, then re-run this script to promote that account.`);
      return;
    }

    const [check] = await conn.execute(
      "SELECT id, username, role FROM users WHERE username = ? LIMIT 1",
      [username]
    );
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
