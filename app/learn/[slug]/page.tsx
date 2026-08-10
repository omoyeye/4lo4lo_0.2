import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Calendar, ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import { GUIDES, getGuide, relatedGuides } from "@/lib/learn-content";
import { pageMetadata, jsonLd, absoluteUrl, SITE_NAME } from "@/lib/seo";
import { LearnNav } from "@/components/learn/LearnNav";

type Params = { params: Promise<{ slug: string }> };

/** Static params so every guide is prerendered at build time. */
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    return pageMetadata({
      title: "Guide not found",
      description: "This guide does not exist.",
      path: `/learn/${slug}`,
      index: false,
    });
  }

  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/learn/${guide.slug}`,
    keywords: guide.keywords,
    type: "article",
    ogTag: guide.category,
    ogSubtitle: `${guide.readMinutes} min read`,
  });
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const related = relatedGuides(guide.slug, 3);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.heading,
    description: guide.description,
    datePublished: guide.published,
    dateModified: guide.updated ?? guide.published,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon-512.png") },
    },
    mainEntityOfPage: absoluteUrl(`/learn/${guide.slug}`),
    keywords: guide.keywords.join(", "),
  };

  const published = new Date(guide.published).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleSchema) }}
      />
      <LearnNav showBack />

      {/* Hero */}
      <div className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${guide.theme.gradient} opacity-[0.08] dark:opacity-[0.15]`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br ${guide.theme.gradient} opacity-20 blur-3xl`}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className={`rounded-full ${guide.theme.tint} px-3 py-1 text-xs font-semibold ${guide.theme.accent}`}
            >
              {guide.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {guide.readMinutes} min read
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={guide.published}>{published}</time>
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {guide.heading}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {guide.intro}
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-10">
        {/* Takeaways */}
        <aside
          className={`rounded-2xl border ${guide.theme.tint} p-6`}
          aria-label="Key takeaways"
        >
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <Lightbulb className={`h-4 w-4 ${guide.theme.accent}`} />
            The short version
          </h2>
          <ul className="mt-3 space-y-2">
            {guide.takeaways.map((t) => (
              <li key={t} className="flex gap-2.5 text-sm leading-relaxed">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br ${guide.theme.gradient}`}
                />
                {t}
              </li>
            ))}
          </ul>
        </aside>

        {/* Body */}
        <article className="mt-10">
          {guide.sections.map((section) => (
            <section key={section.heading} className="mt-10 first:mt-0">
              <h2 className="text-2xl font-bold tracking-tight">
                {section.heading}
              </h2>

              {section.body.map((para, j) => (
                <p
                  key={j}
                  className="mt-4 text-base leading-[1.75] text-muted-foreground"
                >
                  {para}
                </p>
              ))}

              {section.bullets && (
                <ul className="mt-5 space-y-2.5">
                  {section.bullets.map((b) => (
                    <li key={b} className="flex gap-3 leading-relaxed">
                      <span
                        className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br ${guide.theme.gradient}`}
                      />
                      <span className="text-muted-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.callout && (
                <p
                  className={`mt-5 rounded-xl border-l-4 ${guide.theme.tint} px-5 py-4 text-sm font-medium leading-relaxed`}
                  style={{ borderLeftColor: "currentColor" }}
                >
                  {section.callout}
                </p>
              )}

              {section.links && section.links.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${guide.theme.hover} ${guide.theme.accent}`}
                    >
                      {link.label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </article>

        {/* Conversion */}
        <section className="relative mt-14 overflow-hidden rounded-2xl border">
          <div
            aria-hidden
            className={`absolute inset-0 bg-gradient-to-br ${guide.theme.gradient} opacity-[0.1] dark:opacity-[0.18]`}
          />
          <div className="relative p-7 sm:p-9">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <Sparkles className={`h-5 w-5 ${guide.theme.accent}`} />
              Get paid while you grow
            </h2>
            <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
              4lo4lo pays you points for completing social tasks, teaches growth
              in the Classroom, and gives you a public profile for your bio.
              Free to join.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r ${guide.theme.gradient} px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02]`}
              >
                Create a free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/free-tools"
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
              >
                Try the free tools
              </Link>
            </div>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold tracking-tight">Keep reading</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((g) => (
                <Link
                  key={g.slug}
                  href={`/learn/${g.slug}`}
                  className={`group rounded-xl border bg-card p-5 transition-all ${g.theme.hover} hover:shadow-md`}
                >
                  <span
                    className={`text-xs font-semibold ${g.theme.accent}`}
                  >
                    {g.category}
                  </span>
                  <div className="mt-1.5 font-semibold leading-snug">
                    {g.heading}
                  </div>
                  <span className="mt-2.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
                    {g.readMinutes} min read
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
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
