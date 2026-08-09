import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, PlayCircle, Lock, Clock, ArrowRight, Sparkles, Wrench } from "lucide-react";
import { GUIDES, GUIDE_CATEGORIES } from "@/lib/learn-content";
import { getPublicLessons } from "@/lib/classroom-public";
import { pageMetadata, jsonLd, absoluteUrl } from "@/lib/seo";
import { LearnNav } from "@/components/learn/LearnNav";
import { BrandWatermark } from "@/components/BrandLogo";
import { TOOLS, toolHref } from "@/lib/tools-registry";

export const metadata: Metadata = pageMetadata({
  title: "Learn: Free Social Media Growth Guides and Lessons",
  description:
    "Practical guides on growing on TikTok, Instagram and beyond, plus free video lessons from the 4lo4lo Classroom. No account needed to read.",
  path: "/learn",
  keywords: [
    "social media growth guides",
    "how to grow on social media",
    "free creator lessons",
    "content creator tips",
    "social media course free",
  ],
  ogTag: "Learn",
});

// Guides are static; lessons come from the database. Rebuild hourly so newly
// published lessons appear without a deploy.
export const revalidate = 3600;

export default async function Page() {
  const lessons = await getPublicLessons();
  const freeLessons = lessons.filter((l) => l.isFree);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Learn",
    url: absoluteUrl("/learn"),
    description:
      "Free guides and video lessons on growing an audience on social media.",
    hasPart: GUIDES.map((g) => ({
      "@type": "Article",
      headline: g.heading,
      url: absoluteUrl(`/learn/${g.slug}`),
      datePublished: g.published,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <LearnNav />

      {/* Hero */}
      <div className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 opacity-[0.08] dark:opacity-[0.16]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 blur-3xl"
        />
        {/* Brand mark as hero decoration, sized down from the 1.2MB original. */}
        <BrandWatermark
          size={320}
          className="absolute -right-16 -top-10 hidden opacity-[0.07] dark:opacity-[0.12] lg:block"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
            <Sparkles className="h-3.5 w-3.5" />
            Free to read, no account needed
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Learn to grow your audience
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Practical guides and video lessons on building a following, making
            content people actually save, and turning an audience into income.
            Written for creators who want specifics, not motivation.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              {GUIDES.length} guides
            </span>
            {freeLessons.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <PlayCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                {freeLessons.length} free video lessons
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-12">
        {/* Guides */}
        <section>
          <h2 className="text-2xl font-bold tracking-tight">Guides</h2>
          <p className="mt-1.5 text-muted-foreground">
            Long-form, specific, and updated as platforms change.
          </p>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                href={`/learn/${guide.slug}`}
                className={`group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-200 ${guide.theme.hover} hover:-translate-y-0.5 hover:shadow-xl`}
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${guide.theme.gradient} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
                />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full ${guide.theme.tint} px-2.5 py-0.5 text-xs font-semibold ${guide.theme.accent}`}
                    >
                      {guide.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {guide.readMinutes} min
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-bold leading-snug">
                    {guide.heading}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {guide.description}
                  </p>

                  <span
                    className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${guide.theme.accent}`}
                  >
                    Read guide
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Lessons */}
        {lessons.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight">Video lessons</h2>
            <p className="mt-1.5 text-muted-foreground">
              From the Classroom. Free lessons play here, the rest unlock with a
              free account and pay points when you finish them.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/lessons/${lesson.id}`}
                  className="group overflow-hidden rounded-xl border bg-card transition-all hover:border-purple-400 hover:shadow-md dark:hover:border-purple-600"
                >
                  {/*
                    classroom_videos.thumbnailUrl was already being fetched and
                    never rendered. A plain img rather than next/image because
                    these are operator-supplied URLs on arbitrary hosts, and
                    routing those through the image optimiser is both a cost and
                    a fetch-anything surface.
                  */}
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                    {lesson.thumbnailUrl ? (
                      <img
                        src={lesson.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <PlayCircle className="h-10 w-10 text-white/80" />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                  <div className="flex items-center justify-between">
                    {lesson.isFree ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <PlayCircle className="h-3 w-3" />
                        Free
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        Members
                      </span>
                    )}
                    {lesson.pointsReward > 0 && (
                      <span className="text-xs font-medium text-muted-foreground">
                        +{lesson.pointsReward} pts
                      </span>
                    )}
                  </div>

                    <h3 className="mt-3 font-semibold leading-snug">
                      {lesson.title}
                    </h3>
                    {lesson.description && (
                      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {lesson.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tools cross-link */}
        <section className="mt-16 rounded-2xl border bg-gradient-to-br from-purple-50 to-pink-50 p-7 dark:from-purple-950/30 dark:to-pink-950/30 sm:p-9">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Wrench className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            Put it into practice
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {TOOLS.length} free tools, no signup. Work out your engagement rate,
            build a hashtag set, or plan your posting schedule.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {TOOLS.slice(0, 6).map((tool) => (
              <Link
                key={tool.slug}
                href={toolHref(tool)}
                className={`rounded-full border bg-background px-4 py-2 text-sm font-medium transition-colors ${tool.theme.hover}`}
              >
                {tool.name}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t bg-muted/30">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} 4lo4lo</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/learn" className="hover:text-foreground">Learn</Link>
            <Link href="/free-tools" className="hover:text-foreground">Free tools</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
