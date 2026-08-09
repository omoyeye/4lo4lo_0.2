import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component and cannot export metadata, so it is
// declared here. See lib/seo.ts.
export const metadata: Metadata = pageMetadata({
  "title": "Log In",
  "description": "Log in to your 4lo4lo account to continue earning.",
  "path": "/login",
  "index": false
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
