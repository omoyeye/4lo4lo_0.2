import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component and cannot export metadata, so it is
// declared here. See lib/seo.ts.
export const metadata: Metadata = pageMetadata({
  "title": "Creator Leaderboard — Top Earners This Week",
  "description": "See which creators are earning the most points, holding the longest streaks and climbing fastest on 4lo4lo.",
  "path": "/leaderboard",
  "keywords": [
    "creator leaderboard",
    "top creators",
    "social media leaderboard"
  ],
  "ogTag": "Leaderboard"
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
