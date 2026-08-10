import Link from "next/link";
import { Award, CheckCircle2, TrendingUp, Users } from "lucide-react";
import type { FeedEvent } from "@/lib/core/community";

/**
 * Activity feed list. A server component: the feed is read-only, so there is
 * no reason to ship it or its data to the client as JavaScript.
 */

const ICONS = {
  task_completed: CheckCircle2,
  badge_earned: Award,
  level_up: TrendingUp,
} as const;

const TONE = {
  task_completed: {
    tile: "from-emerald-500 to-teal-600",
    tint: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  badge_earned: {
    tile: "from-amber-500 to-orange-600",
    tint: "bg-amber-50 dark:bg-amber-950/30",
  },
  level_up: {
    tile: "from-violet-500 to-fuchsia-600",
    tint: "bg-violet-50 dark:bg-violet-950/30",
  },
} as const;

/** "3 minutes ago" without pulling in a date library. */
function timeAgo(at: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - at.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return at.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function ActivityFeed({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <Users className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-medium">Nothing here yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Once people start completing tasks and earning badges, their activity
          shows up here.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const Icon = ICONS[event.type];
        const tone = TONE[event.type];
        const name = event.actor.displayName?.trim() || event.actor.username;

        return (
          <li
            key={event.id}
            className={`flex items-start gap-4 rounded-xl border ${tone.tint} p-4 transition-colors hover:border-purple-300 dark:hover:border-purple-700`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone.tile} shadow-sm`}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                <Link
                  href={`/profile/${encodeURIComponent(event.actor.username)}`}
                  className="font-semibold hover:underline"
                >
                  {name}
                </Link>{" "}
                <span className="text-muted-foreground">
                  {event.title.replace(new RegExp(`^${name}\\s*`), "")}
                </span>
              </p>

              {event.detail && (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {event.detail}
                </p>
              )}

              <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                <time dateTime={event.at.toISOString()}>{timeAgo(event.at)}</time>
                {typeof event.points === "number" && event.points > 0 && (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    +{event.points} pts
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
