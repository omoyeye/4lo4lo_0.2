/**
 * Shared Sentry options.
 *
 * WHY THIS EXISTS: nothing reported errors before. Several API routes were
 * 404ing in production for a long time and nobody found out, because the only
 * signal was a console.error inside a serverless function that nobody reads.
 * Everything built in this session is now live, so the cost of a silent
 * failure has gone up.
 *
 * INERT WITHOUT A DSN. If SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is unset,
 * Sentry.init is never called and the SDK does nothing. That means this can
 * ship safely before you have an account, and turning it on later is one
 * environment variable rather than a deploy.
 */

export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || "";

export const sentryEnabled = SENTRY_DSN.length > 0;

/** Options shared by the browser, server and edge runtimes. */
export const sharedSentryOptions = {
  dsn: SENTRY_DSN,

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",

  /**
   * Sample rate for performance tracing. Errors are always captured in full;
   * this only governs traces, which are the expensive part of the quota.
   * 10% is plenty to spot a slow route and will not burn a free plan.
   */
  tracesSampleRate: 0.1,

  /** Keep local development out of the production issue stream. */
  enabled: process.env.NODE_ENV === "production",

  /**
   * Noise filter. These are not actionable and would otherwise dominate the
   * issue list and hide real regressions.
   */
  ignoreErrors: [
    // Browser extensions and injected scripts.
    "top.GLOBALS",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // User navigated away mid-request. Not a fault.
    "AbortError",
    "The operation was aborted",
    "Failed to fetch",
    "NetworkError when attempting to fetch resource",
    // Next.js redirect/notFound control flow throws by design.
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    // Our own analytics tag should not report into our own error tracker.
    /googletagmanager\.com/i,
  ],
};

/**
 * Strip anything sensitive before an event leaves the process.
 *
 * This app handles passwords, session tokens and payout details, and Sentry
 * events carry request headers and local variables. Redacting here rather than
 * relying on server-side scrubbing means the data never leaves in the first
 * place.
 */
export function scrubEvent<T extends Record<string, any>>(event: T): T {
  try {
    const req = (event as any).request;
    if (req) {
      // Never send cookies: they contain the session token.
      delete req.cookies;

      if (req.headers) {
        for (const header of ["cookie", "authorization", "x-api-key"]) {
          delete req.headers[header];
        }
      }

      // Query strings can carry tokens on reset-password style links.
      if (typeof req.query_string === "string" && req.query_string.length > 0) {
        req.query_string = "[redacted]";
      }

      if (typeof req.url === "string" && req.url.includes("?")) {
        req.url = req.url.split("?")[0] + "?[redacted]";
      }

      // Request bodies can contain a plaintext password on the login route.
      if (req.data) req.data = "[redacted]";
    }

    // Identify the user by id only. No email, no username.
    if ((event as any).user) {
      const id = (event as any).user.id;
      (event as any).user = id ? { id } : undefined;
    }
  } catch {
    // A scrubbing failure must never stop the error being reported, but it
    // also must not let unscrubbed data through, so drop the request context.
    try {
      delete (event as any).request;
    } catch {
      /* nothing further we can do */
    }
  }

  return event;
}
