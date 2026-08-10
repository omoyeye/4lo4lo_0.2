import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { siteUrl } from "@/lib/seo";
import { GtmScript, GtmNoScript } from "@/components/GoogleTagManager";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  // Makes every relative URL in child metadata (canonical, OG images) resolve
  // against the real origin. Without it Next emits relative OG URLs, which
  // most scrapers ignore.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "4lo4lo: Earn Rewards by Growing Your Social Presence",
    template: "%s | 4lo4lo",
  },
  description:
    "Complete social media tasks, earn points, and grow your online presence with 4lo4lo.",
  keywords: ["social media", "earn points", "tasks", "rewards", "4lo4lo"],
  authors: [{ name: "4lo4lo" }],
  manifest: "/manifest.json",
  // These files now exist in public/, the previous values (/favicon.ico and
  // /apple-touch-icon.png) both 404'd, so the site shipped with no icon at all.
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "4lo4lo",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        {/* Must be the first thing inside <body>, per Google's install. */}
        <GtmNoScript />
        <GtmScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
