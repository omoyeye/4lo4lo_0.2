import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Expose env vars to the browser
  env: {
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.VITE_STRIPE_PUBLIC_KEY || "",
  },

  // Image domains if any remote images are used
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  // Next.js 16 uses Turbopack by default — declare it explicitly to silence the warning.
  // The previous webpack() block was a no-op, so no migration is needed.
  turbopack: {},

  // Suppress the x-powered-by header
  poweredByHeader: false,
};

/*
 * Sentry build integration.
 *
 * Source map upload only happens when SENTRY_AUTH_TOKEN, org and project are
 * all set. Without them the build is unchanged, so this is safe to ship before
 * a Sentry account exists.
 *
 * Uploading source maps is what turns a stack trace of minified nonsense into
 * a real file and line number. Worth doing once you have the account.
 */
const sentryBuildEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT
);

export default sentryBuildEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      // Strip source maps from the client bundle after upload so the code is
      // readable in Sentry but not served to visitors.
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      // Proxy Sentry's ingest through the app's own domain so ad blockers,
      // which block sentry.io directly, do not silently drop your errors.
      tunnelRoute: "/monitoring",
      disableLogger: true,
    })
  : nextConfig;
