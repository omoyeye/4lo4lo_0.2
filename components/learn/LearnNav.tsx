"use client";

import Link from "next/link";
import { BookOpen, Wrench, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * Header for /learn pages.
 *
 * Deliberately links across to the free tools and back to the guides hub:
 * the tools and the guides target different searches, and someone who arrives
 * on one should discover the other.
 */
export function LearnNav({ showBack = false }: { showBack?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <BrandLogo priority />

        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Learn
        </Link>

        <Link
          href="/free-tools"
          className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
        >
          <Wrench className="h-3.5 w-3.5" />
          Free tools
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {showBack && (
            <Link
              href="/learn"
              className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All guides
            </Link>
          )}
          <Link
            href="/signup"
            className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.03]"
          >
            Join free
          </Link>
        </div>
      </div>
    </header>
  );
}
