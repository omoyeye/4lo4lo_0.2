import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import { pageMetadata, jsonLd, absoluteUrl, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";
import { TOOLS } from "@/lib/tools-registry";

/**
 * Server wrapper around the (client) landing page.
 *
 * The landing page needs hooks, so it stays a client component, but a client
 * component cannot export `metadata`, and the root layout's metadata applies
 * to every route. Splitting it this way gives the homepage its own title,
 * canonical URL and structured data.
 */
export const metadata: Metadata = pageMetadata({
  title: "4lo4lo: Earn Rewards and Grow Your Social Presence",
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: [
    "earn money on social media",
    "social media tasks",
    "get paid to follow",
    "creator community",
    "free creator tools",
  ],
  ogTag: "Creator community",
});

export default function Page() {
  /*
   * Structured data. WebSite unlocks the sitelinks search box; Organization
   * consolidates brand signals; ItemList tells search engines the tool pages
   * exist and how they relate, which helps them get discovered and grouped.
   */
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: SITE_NAME,
        url: absoluteUrl("/"),
        logo: absoluteUrl("/icon-512.png"),
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: absoluteUrl("/"),
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": absoluteUrl("/#organization") },
      },
      {
        "@type": "ItemList",
        name: "Free creator tools",
        itemListElement: TOOLS.map((tool, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: tool.name,
          url: absoluteUrl(`/free-tools/${tool.slug}`),
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
