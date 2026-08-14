"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass, Home, Search, Wrench } from "lucide-react";

/**
 * The 404 page.
 *
 * It used to read "Did you forget to add the page to the router?", a message
 * aimed at a developer that shipped to real visitors. That mattered more than
 * it looks: /profile/<name> returns this page for every private or mistyped
 * profile, so it is one of the more frequently hit pages on the site, and now
 * that profiles are private by default it is hit far more often than before.
 *
 * So it is treated as a landing page rather than an error: say plainly that
 * the page is not available, avoid guessing why, and offer the routes a lost
 * visitor actually wants. The guides and free tools are public and need no
 * account, which makes them the useful thing to offer someone who arrived
 * from a search result or a shared link.
 */
export default function NotFound() {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Compass className="h-8 w-8 text-primary" />
        </div>

        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          We could not find that page
        </h1>
        <p className="mt-4 text-muted-foreground">
          The link may be out of date, or the page may be private. Nothing is
          broken on your end.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go to the homepage
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/learn">
              <Search className="mr-2 h-4 w-4" />
              Read the guides
            </Link>
          </Button>
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="text-sm text-muted-foreground">
            Or try the{" "}
            <Link
              href="/free-tools"
              className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
            >
              <Wrench className="h-3.5 w-3.5" />
              free tools
            </Link>
            . No account needed.
          </p>
        </div>
      </div>
    </div>
  );
}
