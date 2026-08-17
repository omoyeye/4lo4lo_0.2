import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getActivityFeed } from "@/lib/core/community";
import { ActivityFeed } from "@/components/community/ActivityFeed";
import { pageMetadata } from "@/lib/seo";
import { BrandLogo } from "@/components/BrandLogo";
import Sidebar from "@/components/layout/Sidebar";
import DesktopTopBar from "@/components/layout/DesktopTopBar";
import { Users, Sparkles, ArrowRight, Info } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Community Activity",
  description:
    "See what creators on 4lo4lo are completing, earning and unlocking right now.",
  path: "/feed",
  // Personalised and constantly changing, so there is nothing stable to index.
  index: false,
});

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  const viewerId = session?.user?.id ? parseInt(session.user.id, 10) : null;

  const { events, personalised, communityEnabled } = await getActivityFeed(
    Number.isFinite(viewerId as number) ? viewerId : null,
    40
  );

  /*
   * This page has two audiences, so it gets two shells.
   *
   * A signed-in member gets the same sidebar as every other page in the app,
   * because arriving here from the app and losing the navigation is
   * disorienting and leaves no way to sign out.
   *
   * A signed-out visitor gets the public marketing header instead. They have
   * no account, so an app sidebar would be a menu of pages they cannot open.
   *
   * Deciding this on the server is safe here because /feed is dynamic, it
   * already reads the session to personalise the feed. It would NOT be safe on
   * a cached page, which is why the profile page does the same thing client
   * side instead.
   */
  const signedIn = Boolean(session?.user?.id);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      {signedIn && <Sidebar />}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen pb-20 md:pb-0">
      {signedIn && <DesktopTopBar />}
      {!signedIn && (
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <BrandLogo priority />
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/leaderboard"
              className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              Leaderboard
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Join free
            </Link>
          </div>
        </div>
      </header>
      )}

      <div className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 opacity-[0.08] dark:opacity-[0.16]"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
            <Sparkles className="h-3.5 w-3.5" />
            {personalised ? "People you follow" : "Across the community"}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Community activity
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {personalised
              ? "What the creators you follow have been up to."
              : "What creators across 4lo4lo are completing and unlocking right now. Follow people to make this your own."}
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/*
          Surfaced in the UI rather than hidden in a log: without the table,
          following silently does nothing, and an operator should be able to
          see why without reading the source.
        */}
        {!communityEnabled && (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium">Following is not switched on yet</p>
              <p className="mt-1 text-muted-foreground">
                An administrator needs to run{" "}
                <code className="text-xs">scripts/sql/006-community-tables.sql</code>.
                Until then this shows activity from across the platform and the
                follow button is inactive.
              </p>
            </div>
          </div>
        )}

        <ActivityFeed events={events} />

        {!session && events.length > 0 && (
          <div className="mt-8 rounded-2xl border bg-gradient-to-br from-purple-50 to-pink-50 p-6 dark:from-purple-950/30 dark:to-pink-950/30">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Join them
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Complete tasks, earn points, and get your own profile to share.
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Create a free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
