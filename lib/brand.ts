import { sql } from "drizzle-orm";
import { BRAND_SETTING_KEY, DEFAULT_BRAND, parseBrand, type BrandProfile } from "@/lib/brand-defaults";

/**
 * Server-side brand profile (see lib/brand-defaults.ts). Cached for a minute
 * per server instance so every email and page render doesn't hit the
 * database; falls back to the defaults if the database is unreachable.
 */

let cache: { at: number; brand: BrandProfile } | null = null;
const TTL_MS = 60_000;

export async function getBrand(): Promise<BrandProfile> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.brand;
  try {
    // Imported here, not at module scope: lib/db throws on import when
    // DATABASE_URL is missing, and the legal pages and emails must still
    // render (with the default brand) when the database isn't available.
    const { queryRows } = await import("@/lib/core/sql-utils");
    const rows = await queryRows<{ value: string }>(sql`SELECT value FROM app_settings WHERE \`key\` = ${BRAND_SETTING_KEY} LIMIT 1`);
    const brand = parseBrand(rows[0]?.value);
    cache = { at: Date.now(), brand };
    return brand;
  } catch {
    return cache?.brand ?? DEFAULT_BRAND;
  }
}

export function clearBrandCache() {
  cache = null;
}

/** Seeds the cache (scripts/render-email-previews.ts uses it to preview a sample brand offline). */
export function primeBrandCache(brand: BrandProfile) {
  cache = { at: Date.now(), brand };
}
