import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Helpers for the tables added by scripts/sql/009 and later.
 *
 * Those tables are accessed with raw SQL rather than Drizzle table objects so
 * that code shipped before the migration runs degrades to "not enabled yet"
 * instead of failing, see isMissingTable().
 */

/** True when a query failed because a table has not been created yet. */
export function isMissingTable(err: unknown): boolean {
  let e = err as { code?: string; errno?: number; message?: string; cause?: unknown } | undefined;
  for (let i = 0; i < 4 && e; i++) {
    if (e.code === "ER_NO_SUCH_TABLE" || e.errno === 1146) return true;
    const msg = String(e.message ?? "");
    if (msg.includes("ER_NO_SUCH_TABLE") || /Table '.+' doesn't exist/.test(msg)) return true;
    e = e.cause as typeof e;
  }
  return false;
}

export async function queryRows<T>(query: SQL): Promise<T[]> {
  const [rows] = (await db.execute(query)) as unknown as [T[]];
  return rows;
}

/** Runs a write and returns affectedRows / insertId. */
export async function execute(query: SQL): Promise<{ affectedRows: number; insertId: number }> {
  const [result] = (await db.execute(query)) as unknown as [{ affectedRows: number; insertId: number }];
  return result;
}

export async function getSettingValue(key: string): Promise<string | null> {
  const rows = await queryRows<{ value: string | null }>(sql`SELECT value FROM app_settings WHERE \`key\` = ${key} LIMIT 1`);
  return rows[0]?.value ?? null;
}

export async function getSettingBool(key: string, fallback: boolean): Promise<boolean> {
  const value = await getSettingValue(key).catch(() => null);
  if (value === null || value === "") return fallback;
  return value === "true";
}

export async function getSettingInt(key: string, fallback: number): Promise<number> {
  const value = await getSettingValue(key).catch(() => null);
  const n = value === null ? NaN : parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}
