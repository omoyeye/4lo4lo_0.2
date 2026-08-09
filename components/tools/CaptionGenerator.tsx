"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, RefreshCcw } from "lucide-react";

/**
 * Caption and bio starting points.
 *
 * Template-driven, not AI-generated, there is no model call behind this. That
 * is a deliberate trade: it works offline, costs nothing, returns instantly,
 * and the page is honest that these are structured starting points to edit
 * rather than finished copy. The value is the structure (hook → body → CTA)
 * and the tonal variety, which is the part most creators actually get wrong.
 */

type Tone = "punchy" | "story" | "question" | "listicle" | "howto";

const TONE_LABEL: Record<Tone, string> = {
  punchy: "Punchy",
  story: "Story-led",
  question: "Question-first",
  listicle: "Listicle",
  howto: "How-to",
};

interface Parts {
  hook: string;
  body: string;
  cta: string;
}

const CTAS = [
  "Save this for later.",
  "Follow for more like this.",
  "Send this to someone who needs it.",
  "Comment your take. I read all of them.",
  "Tap the link in bio for the full version.",
];

function buildCaptions(topic: string, tone: Tone, seed: number): Parts[] {
  const t = topic.trim();
  const T = t.charAt(0).toUpperCase() + t.slice(1);

  const templates: Record<Tone, Parts[]> = {
    punchy: [
      { hook: `${T}. That's it. That's the post.`, body: `Most people overthink ${t}. The ones who get results just start and fix it as they go.`, cta: CTAS[0] },
      { hook: `Nobody tells you this about ${t}.`, body: `The hard part isn't the work. It's doing it on the days you don't feel like it.`, cta: CTAS[1] },
      { hook: `Stop making ${t} complicated.`, body: `Three things matter. The rest is noise you picked up from people selling something.`, cta: CTAS[2] },
    ],
    story: [
      { hook: `Six months ago I was terrible at ${t}.`, body: `I'm not going to pretend it clicked overnight. It didn't. What changed was showing up when it was boring, and boring is most of it.`, cta: CTAS[1] },
      { hook: `I almost gave up on ${t}.`, body: `Then someone pointed out I was measuring the wrong thing entirely. I switched what I tracked and everything moved within a month.`, cta: CTAS[3] },
      { hook: `The ${t} advice that actually changed things for me:`, body: `"Do less, but do it consistently." I ignored it for a year. I shouldn't have.`, cta: CTAS[0] },
    ],
    question: [
      { hook: `What's the one thing about ${t} nobody warned you about?`, body: `Mine: how much of it is just patience. I expected skill to be the bottleneck. It wasn't.`, cta: CTAS[3] },
      { hook: `Be honest, how long have you been putting off ${t}?`, body: `No judgement. I sat on it for months. The version of you in six months is deciding right now.`, cta: CTAS[2] },
      { hook: `Is ${t} actually worth it in 2026?`, body: `Short answer: yes, but not for the reason most people say. Here's what actually pays off.`, cta: CTAS[4] },
    ],
    listicle: [
      { hook: `3 ${t} mistakes I made so you don't have to:`, body: `1. Starting too big.\n2. Copying someone with a completely different starting point.\n3. Quitting right before it compounded.`, cta: CTAS[0] },
      { hook: `5 things I wish I knew about ${t} on day one:`, body: `1. Consistency beats intensity.\n2. Your first attempts are supposed to be bad.\n3. Feedback beats planning.\n4. Track one metric.\n5. Rest is part of it.`, cta: CTAS[1] },
      { hook: `${T}: what works vs what wastes your time.`, body: `Works: small daily reps, one clear focus, honest measurement.\nWastes it: perfect setups, endless research, comparing your start to someone's middle.`, cta: CTAS[2] },
    ],
    howto: [
      { hook: `How to actually get started with ${t} (no fluff):`, body: `Step 1: pick the smallest version that still counts.\nStep 2: do it four times this week.\nStep 3: change one variable and repeat.`, cta: CTAS[0] },
      { hook: `The 10-minute ${t} routine:`, body: `Two minutes to set up. Six to do the work. Two to write down what happened. That last part is the one everyone skips.`, cta: CTAS[1] },
      { hook: `A beginner's guide to ${t} that respects your time:`, body: `You don't need equipment, a course, or a perfect plan. You need to do the thing badly, on purpose, until it's less bad.`, cta: CTAS[4] },
    ],
  };

  const pool = templates[tone];
  // Rotate deterministically so "regenerate" gives a different order, not chaos.
  return pool.map((_, i) => pool[(i + seed) % pool.length]);
}

function buildBios(topic: string): string[] {
  const t = topic.trim();
  return [
    `${t} · sharing what actually works\n📍 building in public\n👇 free tools + guides`,
    `Helping you get better at ${t}\nNo hype. No shortcuts that don't work.\n↓ start here`,
    `${t} enthusiast → practitioner\nPosting the messy middle, not the highlight reel\n🔗 links below`,
    `I write about ${t} for people who are busy.\nShort, tested, no filler.\n👇`,
  ];
}

export function CaptionGenerator() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<Tone>("punchy");
  const [seed, setSeed] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const captions = useMemo(
    () => (topic.trim() ? buildCaptions(topic, tone, seed) : []),
    [topic, tone, seed]
  );
  const bios = useMemo(() => (topic.trim() ? buildBios(topic) : []), [topic]);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="max-w-md">
          <Label htmlFor="cg-topic">What is the post about?</Label>
          <Input
            id="cg-topic"
            placeholder="learning to cook"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1.5"
          />
        </div>

        {topic.trim() ? (
          <Tabs defaultValue="captions" className="mt-6">
            <TabsList>
              <TabsTrigger value="captions">Captions</TabsTrigger>
              <TabsTrigger value="bios">Bios</TabsTrigger>
            </TabsList>

            <TabsContent value="captions" className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(TONE_LABEL) as Tone[]).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={tone === t ? "secondary" : "outline"}
                    onClick={() => setTone(t)}
                  >
                    {TONE_LABEL[t]}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => setSeed((s) => s + 1)}
                >
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                  Shuffle
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {captions.map((c, i) => {
                  const full = `${c.hook}\n\n${c.body}\n\n${c.cta}`;
                  const key = `cap-${i}`;
                  return (
                    <div key={key} className="rounded-lg border p-4">
                      <p className="font-medium">{c.hook}</p>
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {c.body}
                      </p>
                      <p className="mt-2 text-sm">{c.cta}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => copy(key, full)}
                      >
                        {copiedKey === key ? (
                          <><Check className="mr-1.5 h-3.5 w-3.5" /> Copied</>
                        ) : (
                          <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="bios" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {bios.map((b, i) => {
                  const key = `bio-${i}`;
                  return (
                    <div key={key} className="rounded-lg border p-4">
                      <p className="whitespace-pre-line text-sm">{b}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {b.length} characters
                        {b.length > 150 ? " (over Instagram's 150 limit, trim it)" : ""}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => copy(key, b)}
                      >
                        {copiedKey === key ? (
                          <><Check className="mr-1.5 h-3.5 w-3.5" /> Copied</>
                        ) : (
                          <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            Describe your post in a few words to get caption and bio options.
          </p>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          These are structured starting points, not finished copy. The hook and
          the call-to-action are doing most of the work, rewrite the middle in
          your own voice before you post.
        </p>
      </CardContent>
    </Card>
  );
}
