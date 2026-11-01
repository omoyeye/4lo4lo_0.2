import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Confirm Email",
  description: "Confirm the email address on your 4lo4lo account.",
  path: "/verify-email",
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
