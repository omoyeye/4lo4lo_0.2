import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sign In or Register",
  description:
    "Log in to your 4lo4lo account or create a new one. Complete social media tasks, earn points, and grow your online presence.",
  path: "/auth",
  index: true,
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
