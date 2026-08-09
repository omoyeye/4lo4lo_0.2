import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component and cannot export metadata, so it is
// declared here. See lib/seo.ts.
export const metadata: Metadata = pageMetadata({
  "title": "Terms and Conditions",
  "description": "The terms governing your use of 4lo4lo.",
  "path": "/terms",
  "ogTag": "Legal"
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
