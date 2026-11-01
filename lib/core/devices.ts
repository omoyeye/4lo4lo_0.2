import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { execute, isMissingTable, queryRows } from "@/lib/core/sql-utils";

/**
 * Multi-account detection (scripts/sql/009 user_devices).
 *
 * The web app and the native app each keep a random device ID and report it
 * once per session. IPs are stored only as a salted hash, enough to tell that
 * two accounts share a connection without keeping the address.
 */

export const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET ?? "4lo4lo";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function recordDevice(req: NextRequest, userId: number, deviceId: string, platform: string | null): Promise<boolean> {
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 255) || null;
  try {
    await execute(sql`
      INSERT INTO user_devices (user_id, device_id, ip_hash, platform, user_agent)
      VALUES (${userId}, ${deviceId}, ${ipHash(clientIp(req))}, ${platform}, ${ua})
      ON DUPLICATE KEY UPDATE ip_hash = VALUES(ip_hash), user_agent = VALUES(user_agent), last_seen = NOW(), seen_count = seen_count + 1
    `);
    return true;
  } catch (err) {
    if (isMissingTable(err)) return false;
    throw err;
  }
}

interface FlagUser {
  id: number;
  username: string;
  email: string;
  points: number;
  role: string | null;
  created_at: string;
  referred_by: number | null;
}

export interface FraudGroup {
  key: string;
  kind: "device" | "network";
  lastSeen: string;
  users: FlagUser[];
  /** Accounts in the group that were referred by another account in the same group. */
  selfReferrals: number;
}

async function groups(kind: "device" | "network", minUsers: number): Promise<FraudGroup[]> {
  const column = kind === "device" ? sql.raw("device_id") : sql.raw("ip_hash");
  const keys = await queryRows<{ k: string; last_seen: string }>(sql`
    SELECT ${column} AS k, MAX(last_seen) AS last_seen
    FROM user_devices
    WHERE ${column} IS NOT NULL
    GROUP BY ${column}
    HAVING COUNT(DISTINCT user_id) >= ${minUsers}
    ORDER BY COUNT(DISTINCT user_id) DESC, last_seen DESC
    LIMIT 100
  `);
  if (!keys.length) return [];

  const members = await queryRows<FlagUser & { k: string }>(sql`
    SELECT DISTINCT d.${column} AS k, u.id, u.username, u.email, u.points, u.role, u.created_at, u.referred_by
    FROM user_devices d JOIN users u ON u.id = d.user_id
    WHERE d.${column} IN (${sql.join(keys.map((r) => sql`${r.k}`), sql`, `)})
    AND (u.role IS NULL OR u.role <> 'deleted')
  `);

  return keys
    .map((row) => {
      const users = members.filter((m) => m.k === row.k).map(({ k: _k, ...u }) => u);
      const ids = new Set(users.map((u) => u.id));
      return {
        key: row.k.slice(0, 10),
        kind,
        lastSeen: row.last_seen,
        users,
        selfReferrals: users.filter((u) => u.referred_by && ids.has(u.referred_by)).length,
      };
    })
    .filter((g) => g.users.length >= minUsers);
}

export async function fraudReport(): Promise<{ enabled: boolean; devices: FraudGroup[]; networks: FraudGroup[] }> {
  try {
    // Several members on one home or office connection is normal, so the
    // network list needs more accounts before it is worth a look.
    const [devices, networks] = await Promise.all([groups("device", 2), groups("network", 4)]);
    return { enabled: true, devices, networks };
  } catch (err) {
    if (isMissingTable(err)) return { enabled: false, devices: [], networks: [] };
    throw err;
  }
}
