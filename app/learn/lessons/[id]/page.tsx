import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, PlayCircle, Coins, ArrowRight, ArrowLeft, GraduationCap } from "lucide-react";
import { getPublicLesson, getPublicLessons, lessonReadMinutes } from "@/lib/classroom-public";
import { pageMetadata, jsonLd, absoluteUrl, SITE_NAME } from "@/lib/seo";
import { LearnNav } from "@/components/learn/LearnNav";

/**
 * Public page for a Classroom lesson.
 *
 * The title, description and transcript are public for every published lesson,
 * because that text is what search engines can actually index and it is what
 * makes the page worth landing on. The video is only embedded for lessons
 * marked free; for the rest the page shows the transcript and asks for a free
 * account, which is a fair trade and a working funnel.
 *
 * See lib/classroom-public.ts for how the free set is configured.
 */

export const revalidate = 3600;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const lessonId = parseInt(id, 10);
  const lesson = Number.isFinite(lessonId) ? await getPublicLesson(lessonId) : null;

  if (!lesson) {
    return pageMetadata({
      title: "Lesson not found",
      description: "This lesson does not exist or is not published.",
      path: `/learn/lessons/${id}`,
      index: false,
    });
  }

  return pageMetadata({
    title: `${lesson.title}: Free Creator Lesson`,
    description:
      lesson.description ||
      `A lesson from the ${SITE_NAME} Classroom on growing your audience.`,
    path: `/learn/lessons/${lesson.id}`,
    type: "article",
    ogTag: lesson.isFree ? "Free lesson" : "Lesson",
    keywords: [lesson.title, "creator lesson", "social media training"],
  });
}

/** Renders a transcript as paragraphs, splitting on blank lines. */
function Transcript({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-base leading-[1.75] text-muted-foreground">
          {p}
        </p>
      ))}
    </div>
  );
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  const lessonId = parseInt(id, 10);
  if (!Number.isFinite(lessonId)) notFound();

  const lesson = await getPublicLesson(lessonId);
  if (!lesson) notFound();

  const all = await getPublicLessons();
  const index = all.findIndex((l) => l.id === lesson.id);
  const next = index >= 0 ? all[index + 1] : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": lesson.isFree ? "VideoObject" : "Article",
    name: lesson.title,
    headline: lesson.title,
    description: lesson.description,
    ...(lesson.thumbnailUrl ? { thumbnailUrl: lesson.thumbnailUrl } : {}),
    ...(lesson.createdAt
      ? { uploadDate: new Date(lesson.createdAt).toISOString() }
      : {}),
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: absoluteUrl(`/learn/lessons/${lesson.id}`),
    ...(lesson.isFree && lesson.videoUrl ? { contentUrl: lesson.videoUrl } : {}),
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <LearnNav />

      <div className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-[0.07] dark:opacity-[0.14]"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="mb-5 text-sm">
            <Link
              href="/learn"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All lessons and guides
            </Link>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            {lesson.isFree ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <PlayCircle className="h-3.5 w-3.5" />
                Free lesson
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Members only
              </span>
            )}
            {lesson.pointsReward > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Coins className="h-3.5 w-3.5" />
                Earn {lesson.pointsReward} points for finishing
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {lesson.title}
          </h1>
          {lesson.description && (
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
              {lesson.description}
            </p>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-10">
        {/* Video or gate */}
        {lesson.isFree && lesson.videoUrl ? (
          <div className="overflow-hidden rounded-2xl border bg-black">
            <div className="relative aspect-video">
              <iframe
                src={lesson.videoUrl}
                title={lesson.title}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border">
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-[0.1] dark:opacity-[0.18]"
            />
            <div className="relative flex flex-col items-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg">
                <Lock className="h-7 w-7 text-white" />
              </div>
              <h2 className="mt-4 text-xl font-bold">Watch this lesson free</h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                Create an account to play the video and earn{" "}
                {lesson.pointsReward > 0 ? `${lesson.pointsReward} points` : "points"}{" "}
                when you finish it. The full transcript is below either way.
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02]"
              >
                Create a free account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Transcript: the indexable substance of the page */}
        {lesson.transcript.trim() ? (
          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">
              Lesson transcript
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              About a {lessonReadMinutes(lesson)} minute read.
            </p>
            <Transcript text={lesson.transcript} />
          </section>
        ) : (
          <p className="mt-10 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            No transcript has been added for this lesson yet.
          </p>
        )}

        {/* Next lesson */}
        {next && (
          <section className="mt-12">
            <h2 className="text-lg font-bold tracking-tight">Next lesson</h2>
            <Link
              href={`/learn/lessons/${next.id}`}
              className="group mt-3 flex items-center justify-between gap-4 rounded-xl border bg-card p-5 transition-all hover:border-purple-400 hover:shadow-md dark:hover:border-purple-600"
            >
              <div className="min-w-0">
                <div className="font-semibold">{next.title}</div>
                {next.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {next.description}
                  </p>
                )}
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          </section>
        )}

        <section className="mt-12 rounded-2xl border bg-gradient-to-br from-purple-50 to-pink-50 p-7 dark:from-purple-950/30 dark:to-pink-950/30">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            The full Classroom
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Every lesson, plus points for finishing them, tasks that pay, and a
            public profile you can put in your bio.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02]"
            >
              Join free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
            >
              Browse all guides
            </Link>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t bg-muted/30">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
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
