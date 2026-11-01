"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Flame, Gift } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface CheckInStatus {
  checkedInToday: boolean;
  streak: number;
  nextMilestone: { streak: number; bonusPoints: number; daysLeft: number } | null;
}

/** Visible side of the daily check-in that runs on every visit (app/providers.tsx). */
export default function DailyCheckInCard() {
  const { user } = useAuth();
  const { data } = useQuery<CheckInStatus>({ queryKey: ["/api/user/checkin"], enabled: !!user });
  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });
  const daily = parseInt(settings?.daily_checkin_points ?? "0", 10) || 0;

  const streak = data?.streak ?? user?.streakCount ?? 0;
  // Position within the current 7-day run; a completed week shows full.
  const filled = streak === 0 ? 0 : streak % 7 === 0 ? 7 : streak % 7;
  const days = Array.from({ length: 7 }, (_, i) => i < filled);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-md">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Daily streak</p>
            <p className="text-2xl font-bold tabular-nums">
              {streak} day{streak === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {data?.checkedInToday ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Checked in today
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">Checking in…</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label={`${filled} of 7 days this week`}>
        {days.map((on, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={
                on
                  ? "flex h-9 w-full items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 text-white"
                  : "flex h-9 w-full items-center justify-center rounded-lg bg-muted text-muted-foreground"
              }
            >
              {on ? <Flame className="h-4 w-4" /> : <span className="text-xs">{i + 1}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {daily > 0 && <span>+{daily} points every day you visit</span>}
        {data?.nextMilestone && (
          <span className="inline-flex items-center gap-1">
            <Gift className="h-4 w-4 text-pink-600" />
            {data.nextMilestone.daysLeft} day{data.nextMilestone.daysLeft === 1 ? "" : "s"} to a +{data.nextMilestone.bonusPoints} bonus
          </span>
        )}
      </div>
    </div>
  );
}
