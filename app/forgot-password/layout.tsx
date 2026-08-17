import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Forgot Password",
  description: "Reset your 4lo4lo account password.",
  path: "/forgot-password",
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
