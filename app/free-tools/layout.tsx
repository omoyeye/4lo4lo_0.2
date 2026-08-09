import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component and cannot export metadata, so it is
// declared here. See lib/seo.ts.
export const metadata: Metadata = pageMetadata({
  "title": "Free Creator Tools, Hashtags, Captions, Engagement Rate & More",
  "description": "A free toolkit for creators: engagement rate calculator, hashtag generator, caption writer, posting-time planner, growth tracker, image resizer, QR codes and link shortening. No signup required.",
  "path": "/free-tools",
  "keywords": [
    "free social media tools",
    "creator tools",
    "instagram tools",
    "tiktok tools",
    "free hashtag generator"
  ],
  "ogTag": "Free tools"
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
