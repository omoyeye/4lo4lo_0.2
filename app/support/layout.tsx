import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component and cannot export metadata, so it is
// declared here. See lib/seo.ts.
export const metadata: Metadata = pageMetadata({
  "title": "Support — Get Help with 4lo4lo",
  "description": "Questions about tasks, points, payouts or your account? Send the team a message and we will get back to you.",
  "path": "/support",
  "keywords": [
    "4lo4lo support",
    "contact 4lo4lo"
  ],
  "ogTag": "Support"
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
