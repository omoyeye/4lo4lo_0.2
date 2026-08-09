import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component and cannot export metadata, so it is
// declared here. See lib/seo.ts.
export const metadata: Metadata = pageMetadata({
  "title": "Create Your Free Account",
  "description": "Join 4lo4lo, complete social media tasks, earn points and cash out. Free to join, no card required.",
  "path": "/signup",
  "keywords": [
    "join 4lo4lo",
    "earn money social media",
    "get paid to follow"
  ],
  "ogTag": "Sign up"
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
