import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page itself is a client component and cannot export metadata, so it is
// declared here. See lib/seo.ts.
export const metadata: Metadata = pageMetadata({
  "title": "Creator Classroom — Free Social Media Growth Lessons",
  "description": "Short, practical lessons on growing an audience: content strategy, platform algorithms, monetisation and audience retention.",
  "path": "/classroom",
  "keywords": [
    "social media course",
    "how to grow on instagram",
    "creator education",
    "free social media training"
  ],
  "ogTag": "Classroom"
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
