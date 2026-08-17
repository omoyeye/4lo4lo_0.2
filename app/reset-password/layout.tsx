import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Reset Password",
  description: "Set a new password for your 4lo4lo account.",
  path: "/reset-password",
  index: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
