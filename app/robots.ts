import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/admin/",
          // Authenticated surfaces: nothing to index, and they would only
          // ever render a login redirect to a crawler.
          "/dashboard",
          "/settings",
          "/notifications",
          "/payments",
          "/rewards",
          "/referral",
          "/promote-me",
          "/marketplace",
          "/reset-password",
          "/forgot-password",
          // Short links are redirects, not content.
          "/s/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
