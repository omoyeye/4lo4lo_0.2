"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Download } from "lucide-react";

/**
 * Follower growth tracker.
 *
 * Entries are kept in localStorage, not on the server: it means the tool works
 * with no signup (which is the point, it is an acquisition page), and it
 * means we are not storing third-party platform stats for anonymous visitors.
 * The export button exists so the data is not trapped here.
 */

interface Entry {
  id: string;
  date: string; // yyyy-mm-dd
  count: number;
}

const STORAGE_KEY = "4lo4lo:growth-tracker:v1";

function loadEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms / 86_400_000;
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function FollowerGrowthTracker() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [count, setCount] = useState("");
  const [goal, setGoal] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(loadEntries());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage full or blocked, the in-memory session still works.
    }
  }, [entries, hydrated]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  );

  const stats = useMemo(() => {
    if (sorted.length < 2) return null;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const span = daysBetween(first.date, last.date);
    if (span <= 0) return null;

    const gained = last.count - first.count;
    const perDay = gained / span;
    const perWeek = perDay * 7;
    const perMonth = perDay * 30;
    const pctTotal = first.count > 0 ? (gained / first.count) * 100 : 0;

    // Recent trend: last two entries only, to catch a change in direction.
    const prev = sorted[sorted.length - 2];
    const recentSpan = daysBetween(prev.date, last.date);
    const recentPerDay = recentSpan > 0 ? (last.count - prev.count) / recentSpan : 0;

    const goalNum = Number(goal.replace(/[^0-9]/g, ""));
    let projection: string | null = null;
    if (goalNum > last.count) {
      if (perDay > 0) {
        const days = Math.ceil((goalNum - last.count) / perDay);
        const eta = new Date(Date.now() + days * 86_400_000);
        projection = `About ${days.toLocaleString()} days, landing around ${eta.toLocaleDateString(
          undefined,
          { month: "long", year: "numeric" }
        )}, if your current pace holds.`;
      } else {
        projection = "Your average growth is flat or negative, so there is no meaningful projection yet.";
      }
    }

    return { span, gained, perDay, perWeek, perMonth, pctTotal, recentPerDay, projection, last };
  }, [sorted, goal]);

  const add = () => {
    const n = Number(count.replace(/[^0-9]/g, ""));
    if (!date || !Number.isFinite(n) || n <= 0) return;
    setEntries((prev) => [
      ...prev.filter((e) => e.date !== date), // one entry per date
      { id: `${date}-${n}-${Math.random().toString(36).slice(2, 7)}`, date, count: n },
    ]);
    setCount("");
  };

  const remove = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const exportCsv = () => {
    const csv = ["date,followers", ...sorted.map((e) => `${e.date},${e.count}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "follower-growth.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const max = Math.max(...sorted.map((e) => e.count), 1);
  const min = Math.min(...sorted.map((e) => e.count), 0);
  const range = Math.max(max - min, 1);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="fgt-date">Date</Label>
            <Input
              id="fgt-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="fgt-count">Follower count</Label>
            <Input
              id="fgt-count"
              inputMode="numeric"
              placeholder="12400"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              className="mt-1.5"
            />
          </div>
          <Button onClick={add}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>

        {sorted.length > 0 && (
          <div className="mt-8">
            {/* Simple inline bar chart, no charting dependency needed. */}
            <div className="flex h-32 items-end gap-1.5" role="img" aria-label="Follower counts over time">
              {sorted.map((e) => (
                <div key={e.id} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${((e.count - min) / range) * 100 || 4}%` }}
                    title={`${e.date}: ${e.count.toLocaleString()}`}
                  />
                </div>
              ))}
            </div>

            <ul className="mt-4 divide-y rounded-lg border">
              {sorted.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">{e.date}</span>
                  <span className="font-medium tabular-nums">{e.count.toLocaleString()}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Remove entry for ${e.date}`}
                    onClick={() => remove(e.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>

            <Button size="sm" variant="outline" className="mt-3" onClick={exportCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        )}

        <div aria-live="polite" className="mt-6">
          {stats ? (
            <div className="rounded-lg border bg-muted/40 p-5">
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Per day</p>
                  <p className="text-xl font-bold tabular-nums">
                    {stats.perDay >= 0 ? "+" : ""}{fmt(stats.perDay)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Per week</p>
                  <p className="text-xl font-bold tabular-nums">
                    {stats.perWeek >= 0 ? "+" : ""}{fmt(stats.perWeek)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Per month</p>
                  <p className="text-xl font-bold tabular-nums">
                    {stats.perMonth >= 0 ? "+" : ""}{fmt(stats.perMonth)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total change</p>
                  <p className="text-xl font-bold tabular-nums">
                    {stats.pctTotal >= 0 ? "+" : ""}{fmt(stats.pctTotal)}%
                  </p>
                </div>
              </div>

              {Math.abs(stats.recentPerDay - stats.perDay) > Math.max(1, stats.perDay * 0.25) && (
                <p className="mt-4 text-sm">
                  <span className="font-medium">Recent trend differs:</span>{" "}
                  your latest interval is running at {fmt(stats.recentPerDay)}/day
                  versus a {fmt(stats.perDay)}/day average
                  {stats.recentPerDay > stats.perDay ? ", and accelerating." : ", and slowing down."}
                </p>
              )}

              <div className="mt-5 border-t pt-4">
                <Label htmlFor="fgt-goal" className="text-xs">Goal (optional)</Label>
                <Input
                  id="fgt-goal"
                  inputMode="numeric"
                  placeholder="25000"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="mt-1.5 max-w-[200px]"
                />
                {stats.projection && (
                  <p className="mt-2.5 text-sm text-muted-foreground">{stats.projection}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              Add at least two entries on different dates to see your growth rate.
            </p>
          )}
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          Entries are stored in this browser only, nothing is uploaded, and
          clearing your browser data will clear them. Export to CSV to keep a copy.
        </p>
      </CardContent>
    </Card>
  );
}
