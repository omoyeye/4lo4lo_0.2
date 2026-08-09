"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Engagement rate = total interactions / reach, expressed as a percentage.
 *
 * We calculate against followers (ER by follower) because reach is not public
 * for most accounts. That is the industry-standard fallback and it is what
 * every comparable calculator uses, but it is an approximation, and the copy
 * on the page says so rather than implying precision we do not have.
 */

type Platform = "instagram" | "tiktok" | "youtube" | "x" | "facebook";

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X (Twitter)",
  facebook: "Facebook",
};

/**
 * Rough benchmark bands, in percent, by platform.
 *
 * These are broad industry reference ranges, not measurements of your niche.
 * Presented as "low / typical / strong" rather than a single number, because a
 * single number would imply an accuracy that does not exist.
 */
const BENCHMARKS: Record<Platform, { low: number; typical: number; strong: number }> = {
  instagram: { low: 0.5, typical: 1.5, strong: 3.5 },
  tiktok: { low: 2, typical: 4.5, strong: 9 },
  youtube: { low: 1, typical: 2.5, strong: 5 },
  x: { low: 0.2, typical: 0.6, strong: 1.5 },
  facebook: { low: 0.1, typical: 0.4, strong: 1 },
};

function num(value: string): number {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function EngagementRateCalculator() {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [followers, setFollowers] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [saves, setSaves] = useState("");

  const result = useMemo(() => {
    const f = num(followers);
    if (f <= 0) return null;

    const interactions = num(likes) + num(comments) + num(shares) + num(saves);
    const rate = (interactions / f) * 100;
    const bands = BENCHMARKS[platform];

    let verdict: string;
    let tone: "low" | "ok" | "good" | "great";
    if (rate < bands.low) {
      verdict = `Below the typical range for ${PLATFORM_LABEL[platform]}.`;
      tone = "low";
    } else if (rate < bands.typical) {
      verdict = `Within the normal range, below the median.`;
      tone = "ok";
    } else if (rate < bands.strong) {
      verdict = `Above the median for ${PLATFORM_LABEL[platform]}. Healthy.`;
      tone = "good";
    } else {
      verdict = `Strong, in the upper band for ${PLATFORM_LABEL[platform]}.`;
      tone = "great";
    }

    return { rate, interactions, verdict, tone, bands };
  }, [platform, followers, likes, comments, shares, saves]);

  const toneClass = {
    low: "text-amber-600 dark:text-amber-400",
    ok: "text-muted-foreground",
    good: "text-emerald-600 dark:text-emerald-400",
    great: "text-emerald-600 dark:text-emerald-400",
  } as const;

  const reset = () => {
    setFollowers("");
    setLikes("");
    setComments("");
    setShares("");
    setSaves("");
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="erc-platform">Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger id="erc-platform" className="mt-1.5">
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

          <div>
            <Label htmlFor="erc-followers">Followers</Label>
            <Input
              id="erc-followers"
              inputMode="numeric"
              placeholder="12000"
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="erc-likes">Average likes per post</Label>
            <Input
              id="erc-likes"
              inputMode="numeric"
              placeholder="480"
              value={likes}
              onChange={(e) => setLikes(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="erc-comments">Average comments</Label>
            <Input
              id="erc-comments"
              inputMode="numeric"
              placeholder="35"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="erc-shares">
              Average shares <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="erc-shares"
              inputMode="numeric"
              placeholder="12"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="erc-saves">
              Average saves <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="erc-saves"
              inputMode="numeric"
              placeholder="20"
              value={saves}
              onChange={(e) => setSaves(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <div aria-live="polite" className="mt-6">
          {result ? (
            <div className="rounded-lg border bg-muted/40 p-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-4xl font-bold tabular-nums">
                  {result.rate.toFixed(2)}%
                </span>
                <span className="text-sm text-muted-foreground">
                  engagement rate ({result.interactions.toLocaleString()} interactions
                  ÷ {num(followers).toLocaleString()} followers)
                </span>
              </div>

              <p className={`mt-2 text-sm font-medium ${toneClass[result.tone]}`}>
                {result.verdict}
              </p>

              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-background p-3">
                  <dt className="text-muted-foreground">Low</dt>
                  <dd className="font-medium tabular-nums">under {result.bands.low}%</dd>
                </div>
                <div className="rounded-md bg-background p-3">
                  <dt className="text-muted-foreground">Typical</dt>
                  <dd className="font-medium tabular-nums">~{result.bands.typical}%</dd>
                </div>
                <div className="rounded-md bg-background p-3">
                  <dt className="text-muted-foreground">Strong</dt>
                  <dd className="font-medium tabular-nums">{result.bands.strong}%+</dd>
                </div>
              </dl>

              <p className="mt-4 text-xs text-muted-foreground">
                Benchmarks are broad industry reference ranges, not measurements of
                your niche. A tight 2% audience usually beats a loose 5% one.
              </p>

              <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
                Clear
              </Button>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              Enter your follower count and average likes to see your engagement rate.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
