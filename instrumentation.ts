import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook.
 *
 * Loads the right Sentry config per runtime. Both are guarded on a DSN being
 * present, so with no DSN this costs a dynamic import and nothing else.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Captures errors thrown inside React Server Components, server actions and
 * route handlers.
 *
 * This is the important one for this codebase. Most of the API surface is
 * route handlers wrapped in try/catch that call console.error and return a
 * 500. Without this hook those never reach an error tracker, which is exactly
 * how a set of endpoints stayed broken in production without anyone noticing.
 */
export const onRequestError = Sentry.captureRequestError;
