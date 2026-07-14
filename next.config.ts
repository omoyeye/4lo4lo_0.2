import type { NextConfig } from "next";

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

export default nextConfig;
