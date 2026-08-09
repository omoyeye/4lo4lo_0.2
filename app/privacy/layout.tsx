import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component and cannot export metadata, so it is
// declared here. See lib/seo.ts.
export const metadata: Metadata = pageMetadata({
  "title": "Privacy Policy",
  "description": "How 4lo4lo collects, uses and protects your personal data.",
  "path": "/privacy",
  "ogTag": "Legal"
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
