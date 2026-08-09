"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Posting-window guidance, converted to the visitor's timezone.
 *
 * IMPORTANT — what this is and is not: the windows below are general guidance
 * drawn from commonly published industry patterns, expressed in US Eastern
 * because that is the reference most published studies use. They are NOT
 * measurements of this user's audience, and the UI says so plainly rather than
 * presenting invented precision. The genuinely useful work this does is the
 * timezone conversion and turning "post at 9am" into a plan.
 */

type Platform = "instagram" | "tiktok" | "youtube" | "x" | "facebook" | "linkedin";

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X (Twitter)",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Windows in hours (24h), in the reference timezone (US Eastern, UTC-5). */
const REFERENCE_UTC_OFFSET = -5;

const WINDOWS: Record<Platform, { hours: number[]; bestDays: string[]; note: string }> = {
  instagram: {
    hours: [11, 12, 13, 19, 20],
    bestDays: ["Tue", "Wed", "Thu"],
    note: "Lunchtime and the post-work scroll tend to be the two reliable peaks.",
  },
  tiktok: {
    hours: [6, 10, 19, 20, 22],
    bestDays: ["Tue", "Thu", "Fri"],
    note: "Late evening performs unusually well here compared with other platforms.",
  },
  youtube: {
    hours: [14, 15, 16, 17],
    bestDays: ["Thu", "Fri", "Sat"],
    note: "Publish a few hours before your audience's peak viewing so the algorithm can start testing it.",
  },
  x: {
    hours: [8, 9, 12, 17],
    bestDays: ["Tue", "Wed", "Thu"],
    note: "Weekday commute and lunch hours. Timeline half-life is short, so cadence matters more than timing.",
  },
  facebook: {
    hours: [9, 10, 13, 15],
    bestDays: ["Tue", "Wed", "Thu"],
    note: "Skews earlier and more weekday-business than the visual platforms.",
  },
  linkedin: {
    hours: [8, 9, 10, 12, 17],
    bestDays: ["Tue", "Wed", "Thu"],
    note: "Strictly business hours. Weekend posting is close to dead.",
  },
};

function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? "am" : "pm";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}

export function BestTimeToPost() {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [offset, setOffset] = useState<number | null>(null);
  const [tzName, setTzName] = useState<string>("");

  useEffect(() => {
    // Browser offset is minutes *behind* UTC, so invert it.
    setOffset(-new Date().getTimezoneOffset() / 60);
    try {
      setTzName(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setTzName("");
    }
  }, []);

  const converted = useMemo(() => {
    if (offset === null) return null;
    const shift = offset - REFERENCE_UTC_OFFSET;
    const w = WINDOWS[platform];
    return {
      hours: w.hours.map((h) => ((h + shift) % 24 + 24) % 24).sort((a, b) => a - b),
      bestDays: w.bestDays,
      note: w.note,
    };
  }, [platform, offset]);

  const heat = useMemo(() => {
    if (!converted) return null;
    const set = new Set(converted.hours.map((h) => Math.round(h)));
    return DAYS.map((day) => ({
      day,
      isBestDay: converted.bestDays.includes(day),
      hours: Array.from({ length: 24 }, (_, h) => set.has(h)),
    }));
  }, [converted]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="max-w-xs">
          <Label htmlFor="btp-platform">Platform</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger id="btp-platform" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PLATFORM_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {converted ? (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              Shown in your timezone
              {tzName ? (
                <>
                  {" "}
                  (<span className="font-medium text-foreground">{tzName}</span>)
                </>
              ) : null}
              .
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {converted.hours.map((h) => (
                <span
                  key={h}
                  className="rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary"
                >
                  {formatHour(h)}
                </span>
              ))}
            </div>

            <p className="mt-4 text-sm">
              <span className="font-medium">Strongest days:</span>{" "}
              {converted.bestDays.join(", ")}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">{converted.note}</p>

            {heat && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[560px] border-separate border-spacing-0.5 text-xs">
                  <caption className="sr-only">
                    Suggested posting windows by day and hour
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="w-10" />
                      {Array.from({ length: 24 }, (_, h) => (
                        <th
                          key={h}
                          scope="col"
                          className="p-0 font-normal text-muted-foreground"
                        >
                          {h % 6 === 0 ? h : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heat.map((row) => (
                      <tr key={row.day}>
                        <th
                          scope="row"
                          className={`pr-2 text-right font-normal ${
                            row.isBestDay ? "text-foreground font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {row.day}
                        </th>
                        {row.hours.map((on, h) => (
                          <td
                            key={h}
                            className={`h-5 rounded-sm ${
                              on
                                ? row.isBestDay
                                  ? "bg-primary"
                                  : "bg-primary/40"
                                : "bg-muted"
                            }`}
                            title={`${row.day} ${formatHour(h)}`}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-6 rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
              These are general industry patterns converted to your timezone — not
              measurements of your audience. Treat them as a starting schedule,
              then check your own analytics after two weeks and adjust. Your
              audience&apos;s actual behaviour always beats a generic benchmark.
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Detecting your timezone…</p>
        )}
      </CardContent>
    </Card>
  );
}
