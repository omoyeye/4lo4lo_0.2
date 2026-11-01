import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Email Preferences",
  description: "Manage 4lo4lo announcement emails.",
  path: "/unsubscribe",
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
