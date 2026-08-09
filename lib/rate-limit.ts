import { NextRequest, NextResponse } from "next/server";

/**
 * In-process fixed-window rate limiter.
 *
 * ── KNOWN LIMITATION ON VERCEL ──────────────────────────────────────────────
 *
 * This project deploys to Vercel serverless functions, so this Map lives in a
 * single lambda instance and each concurrent instance keeps its own counters.
 * The effective limit is therefore roughly `limit × instances`, and an attacker
 * generating enough concurrency to be spread across instances gets a
 * proportionally larger budget.
 *
 * It is still worth having, it stops the trivial single-connection loop, which
 * is the common case for credential stuffing and scripted abuse, but do not
 * treat these numbers as hard guarantees.
 *
 * The real fix is a shared store. Provision Upstash Redis (Vercel dashboard →
 * Storage → Upstash) and replace the `hits` Map with it; `check()` is the only
 * function that touches the store, so nothing else in the codebase changes.
 * Everything below is deliberately synchronous to keep that swap small, if you
 * move to Redis, `check()` and `rateLimit()` become async and the ~8 call sites
 * need an `await`.
 */

type Bucket = { count: number; resetAt: number };

const globalForRateLimit = global as unknown as { __rateLimitHits?: Map<string, Bucket> };
const hits: Map<string, Bucket> = globalForRateLimit.__rateLimitHits ?? new Map();
globalForRateLimit.__rateLimitHits = hits;

// Drop expired buckets occasionally so the Map cannot grow without bound.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of hits) {
    if (bucket.resetAt <= now) hits.delete(key);
  }
}

/** Best-effort client identity: proxy headers first, then a fixed fallback. */
export function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitOptions {
  /** Max requests allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Namespace so different routes don't share a bucket. */
  name: string;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function check(identifier: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const key = `${opts.name}:${identifier}`;
  const bucket = hits.get(key);

  if (!bucket || bucket.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;

  if (bucket.count > opts.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return {
    ok: true,
    remaining: opts.limit - bucket.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Guard a route handler. Returns a 429 NextResponse when the caller is over
 * budget, otherwise null.
 *
 * Usage:
 *   const limited = rateLimit(req, { name: "login", limit: 10, windowMs: 60_000 });
 *   if (limited) return limited;
 */
export function rateLimit(
  req: NextRequest,
  opts: RateLimitOptions,
  identifier?: string
): NextResponse | null {
  const result = check(identifier ?? clientKey(req), opts);
  if (result.ok) return null;

  return NextResponse.json(
    {
      message: "Too many requests. Please slow down and try again shortly.",
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(opts.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/** Preset windows used across the app, kept in one place so they stay coherent. */
export const LIMITS = {
  /** Credential endpoints, tight, keyed by IP. */
  auth: { name: "auth", limit: 10, windowMs: 60_000 },
  /** Account creation. */
  register: { name: "register", limit: 5, windowMs: 60 * 60_000 },
  /** Points-earning actions, the fraud-sensitive path. */
  taskAction: { name: "task-action", limit: 60, windowMs: 60_000 },
  /** Anonymous public tools that write rows. */
  publicTool: { name: "public-tool", limit: 20, windowMs: 60 * 60_000 },
  /** Outbound-email endpoints. */
  contact: { name: "contact", limit: 5, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateLimitOptions>;
