"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check } from "lucide-react";

/**
 * Hashtag set builder.
 *
 * Deliberately does NOT display search volumes or "popularity" scores. There
 * is no live hashtag-volume API behind this, and inventing numbers would be
 * worse than useless, creators make real posting decisions on them. What it
 * does instead is genuinely useful and honest: it applies the broad/niche/
 * long-tail structure that actually works, sized to each platform's limits.
 */

type Platform = "instagram" | "tiktok" | "youtube" | "x" | "linkedin";

const PLATFORM: Record<Platform, { label: string; max: number; advice: string }> = {
  instagram: {
    label: "Instagram",
    max: 30,
    advice: "Instagram allows 30. Most accounts see better results with 8-15 relevant ones than with 30 loose ones.",
  },
  tiktok: {
    label: "TikTok",
    max: 8,
    advice: "TikTok caption space is tight. 3-5 focused tags is the practical ceiling.",
  },
  youtube: {
    label: "YouTube",
    max: 15,
    advice: "Only the first 3 show above the title. Put the ones that matter first.",
  },
  x: {
    label: "X (Twitter)",
    max: 3,
    advice: "One or two. More reads as spam and measurably reduces engagement.",
  },
  linkedin: {
    label: "LinkedIn",
    max: 5,
    advice: "Three is the norm. Broad professional topics outperform niche tags here.",
  },
};

/** Modifiers that turn a seed keyword into a structured set. */
const NICHE_SUFFIX = ["tips", "ideas", "hacks", "guide", "daily", "community", "life", "lover"];
const NICHE_PREFIX = ["the", "my", "your", "real", "everyday"];
const LONGTAIL = [
  "forbeginners", "2026", "howto", "explained", "athome",
  "onabudget", "checklist", "routine", "challenge", "inspo",
];
const BROAD = [
  "contentcreator", "creatorcommunity", "smallcreator", "growthtips",
  "socialmediatips", "explorepage", "viral", "trending",
];

function clean(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function toTag(s: string): string {
  return `#${s.replace(/\s+/g, "")}`;
}

export function HashtagGenerator() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [copied, setCopied] = useState(false);

  const sets = useMemo(() => {
    const seed = clean(topic);
    if (!seed) return null;

    const words = seed.split(/\s+/).filter(Boolean);
    const compact = words.join("");
    const primary = words[words.length - 1] ?? compact;

    const niche = [
      ...NICHE_SUFFIX.map((s) => toTag(`${compact}${s}`)),
      ...NICHE_PREFIX.map((p) => toTag(`${p}${compact}`)),
    ];

    const longTail = LONGTAIL.map((l) => toTag(`${compact}${l}`));

    const broad = [
      toTag(compact),
      ...(words.length > 1 ? [toTag(primary)] : []),
      ...BROAD.map((b) => toTag(b)),
    ];

    const dedupe = (arr: string[]) => Array.from(new Set(arr));

    return {
      broad: dedupe(broad),
      niche: dedupe(niche),
      longTail: dedupe(longTail),
    };
  }, [topic]);

  /** A balanced selection sized to the platform: ~30% broad, 45% niche, 25% long-tail. */
  const selected = useMemo(() => {
    if (!sets) return [];
    const max = PLATFORM[platform].max;
    const take = (arr: string[], n: number) => arr.slice(0, Math.max(0, n));
    const nBroad = Math.max(1, Math.round(max * 0.3));
    const nNiche = Math.max(1, Math.round(max * 0.45));
    const nLong = Math.max(0, max - nBroad - nNiche);
    return Array.from(
      new Set([
        ...take(sets.broad, nBroad),
        ...take(sets.niche, nNiche),
        ...take(sets.longTail, nLong),
      ])
    ).slice(0, max);
  }, [sets, platform]);

  const copyAll = async () => {
    if (!selected.length) return;
    try {
      await navigator.clipboard.writeText(selected.join(" "));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="hg-topic">Your topic or niche</Label>
            <Input
              id="hg-topic"
              placeholder="home workout"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="hg-platform">Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger id="hg-platform" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PLATFORM) as Platform[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLATFORM[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div aria-live="polite" className="mt-6">
          {selected.length > 0 && sets ? (
            <>
              <div className="rounded-lg border bg-muted/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {selected.length} tags for {PLATFORM[platform].label}
                  </span>
                  <Button size="sm" variant="outline" onClick={copyAll}>
                    {copied ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy all
                      </>
                    )}
                  </Button>
                </div>
                <p className="mt-3 break-words text-sm leading-relaxed">
                  {selected.join(" ")}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {PLATFORM[platform].advice}
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { title: "Broad", body: sets.broad, hint: "High reach, high competition" },
                  { title: "Niche", body: sets.niche, hint: "Where you can realistically rank" },
                  { title: "Long-tail", body: sets.longTail, hint: "Low volume, high intent" },
                ].map((group) => (
                  <div key={group.title} className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium">{group.title}</h3>
                    <p className="text-xs text-muted-foreground">{group.hint}</p>
                    <p className="mt-2.5 break-words text-xs leading-relaxed text-muted-foreground">
                      {group.body.slice(0, 10).join(" ")}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Always check a tag on the platform before using it, a small number
                are banned or have been overrun with unrelated content, and no
                offline generator can know that.
              </p>
            </>
          ) : (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              Enter a topic to build a hashtag set.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
