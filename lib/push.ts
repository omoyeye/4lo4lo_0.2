import { after } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Push notifications for the native app, via Expo's push service.
 *
 * Every notification row is created through storage.createNotification(),
 * which calls queuePush(). Pushes are collected for the duration of a request
 * and sent once it has finished (next/server `after`), so a broadcast to every
 * member costs a handful of batched calls rather than one per user, and never
 * slows down the response that triggered it.
 *
 * Depends on the mobile_push_tokens table (scripts/sql/008). Until that exists
 * every function here is a quiet no-op.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH = 100;
const USER_QUERY_BATCH = 500;

export const PUSH_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

interface PendingPush {
  userId: number;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

let pending: PendingPush[] = [];
let flushScheduled = false;

export function isMissingTableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("ER_NO_SUCH_TABLE") || msg.includes("mobile_push_tokens' doesn't exist");
}

export function queuePush(push: PendingPush): void {
  pending.push(push);
  if (flushScheduled) return;
  flushScheduled = true;
  const run = () => {
    flushScheduled = false;
    const batch = pending;
    pending = [];
    return sendPushes(batch).catch((err) => console.error("push: send failed", err));
  };
  try {
    after(run);
  } catch {
    // Outside a request (scripts, cron): send right away instead.
    void run();
  }
}

async function tokensFor(userIds: number[]): Promise<Map<number, string[]>> {
  const byUser = new Map<number, string[]>();
  for (let i = 0; i < userIds.length; i += USER_QUERY_BATCH) {
    const chunk = userIds.slice(i, i + USER_QUERY_BATCH);
    const [rows] = (await db.execute(
      sql`SELECT user_id, token FROM mobile_push_tokens WHERE user_id IN (${sql.join(
        chunk.map((id) => sql`${id}`),
        sql`, `
      )})`
    )) as unknown as [{ user_id: number; token: string }[]];
    for (const row of rows) {
      const list = byUser.get(row.user_id) ?? [];
      list.push(row.token);
      byUser.set(row.user_id, list);
    }
  }
  return byUser;
}

async function removeTokens(tokens: string[]): Promise<void> {
  if (!tokens.length) return;
  await db.execute(
    sql`DELETE FROM mobile_push_tokens WHERE token IN (${sql.join(
      tokens.map((t) => sql`${t}`),
      sql`, `
    )})`
  );
}

async function sendPushes(batch: PendingPush[]): Promise<void> {
  if (!batch.length) return;

  let byUser: Map<number, string[]>;
  try {
    byUser = await tokensFor(Array.from(new Set(batch.map((p) => p.userId))));
  } catch (err) {
    if (isMissingTableError(err)) return;
    throw err;
  }

  const messages = batch.flatMap((p) =>
    (byUser.get(p.userId) ?? []).map((to) => ({
      to,
      title: p.title,
      body: p.body.length > 240 ? `${p.body.slice(0, 237)}...` : p.body,
      data: p.data,
      sound: "default" as const,
      channelId: "default",
    }))
  );
  if (!messages.length) return;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  // Optional: set if "Enhanced push security" is turned on in the Expo dashboard.
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += EXPO_BATCH) {
    const chunk = messages.slice(i, i + EXPO_BATCH);
    const res = await fetch(EXPO_PUSH_URL, { method: "POST", headers, body: JSON.stringify(chunk) });
    if (!res.ok) {
      console.error("push: Expo responded", res.status, await res.text().catch(() => ""));
      continue;
    }
    const body = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
    body?.data?.forEach((ticket, idx) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") dead.push(chunk[idx].to);
    });
  }

  await removeTokens(dead).catch((err) => console.error("push: could not prune tokens", err));
}

export async function savePushToken(userId: number, token: string, platform: string | null): Promise<void> {
  await db.execute(
    sql`INSERT INTO mobile_push_tokens (user_id, token, platform) VALUES (${userId}, ${token}, ${platform})
        ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform), updated_at = CURRENT_TIMESTAMP`
  );
}

export async function deletePushToken(userId: number, token: string): Promise<void> {
  await db.execute(sql`DELETE FROM mobile_push_tokens WHERE token = ${token} AND user_id = ${userId}`);
}
