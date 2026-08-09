import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Gift,
  Activity,
  Clock,
  Hash,
  PenLine,
  TrendingUp,
  Crop,
  QrCode,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { otherTools, toolHref, type ToolDefinition } from "@/lib/tools-registry";
import { ToolsNav } from "@/components/tools/ToolsNav";
import { BrandWatermark } from "@/components/BrandLogo";

/**
 * Shared chrome for a public tool page.
 *
 * A server component on purpose: the explainer, FAQ and cross-links are the
 * part search engines read, so they must be in the server-rendered HTML. Only
 * the interactive widget passed as `children` is a client component.
 *
 * Each tool carries its own colour theme from the registry, so the hero, icon
 * and accents shift per tool. That gives the set visual variety while keeping
 * one layout.
 */

const ICONS: Record<string, LucideIcon> = {
  Activity,
  Clock,
  Hash,
  PenLine,
  TrendingUp,
  Crop,
  QrCode,
  Link2,
};

export interface FaqItem {
  question: string;
  answer: string;
}

export function ToolPageShell({
  tool,
  intro,
  children,
  explainer,
  faq,
}: {
  tool: ToolDefinition;
  /** One or two sentences under the H1. */
  intro: string;
  /** The interactive widget. */
  children: ReactNode;
  /** Long-form body copy, which is what gives the page something to rank on. */
  explainer: ReactNode;
  faq: FaqItem[];
}) {
  const related = otherTools(tool.slug, 3);
  const Icon = ICONS[tool.icon] ?? Activity;

  return (
    <div className="min-h-screen bg-background">
      <ToolsNav activeSlug={tool.slug} />

      {/* Hero */}
      <div className="relative overflow-hidden border-b">
        {/* Decorative wash. Pure CSS, so it costs nothing to load. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tool.theme.gradient} opacity-[0.08] dark:opacity-[0.14]`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br ${tool.theme.gradient} opacity-20 blur-3xl`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "28px 28px",
            color: "rgb(148 163 184 / 0.4)",
          }}
        />
        {/* Brand mark as hero decoration. */}
        <BrandWatermark
          size={280}
          className="absolute -right-12 -top-8 hidden opacity-[0.07] dark:opacity-[0.12] lg:block"
        />

        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <Link
              href="/free-tools"
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All free tools
            </Link>
          </nav>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.theme.gradient} shadow-lg`}
            >
              <Icon className="h-8 w-8 text-white" />
            </div>

            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full ${tool.theme.tint} px-3 py-1 text-xs font-semibold ${tool.theme.accent}`}
              >
                <Gift className="h-3.5 w-3.5" />
                Free, no signup
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {tool.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {intro}
              </p>

              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <li className="inline-flex items-center gap-1.5">
                  <Zap className={`h-4 w-4 ${tool.theme.accent}`} />
                  Instant results
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <ShieldCheck className={`h-4 w-4 ${tool.theme.accent}`} />
                  Nothing uploaded
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Sparkles className={`h-4 w-4 ${tool.theme.accent}`} />
                  No account needed
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
        {children}

        <section className="prose prose-neutral dark:prose-invert mt-14 max-w-none prose-headings:tracking-tight prose-a:font-medium">
          {explainer}
        </section>

        {faq.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-bold tracking-tight">
              Frequently asked questions
            </h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {faq.map((item) => (
                <div
                  key={item.question}
                  className={`rounded-xl border ${tool.theme.tint} p-5`}
                >
                  <dt className="font-semibold">{item.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Conversion block */}
        <section className="relative mt-14 overflow-hidden rounded-2xl border">
          <div
            aria-hidden
            className={`absolute inset-0 bg-gradient-to-br ${tool.theme.gradient} opacity-[0.1] dark:opacity-[0.18]`}
          />
          <div className="relative p-7 sm:p-10">
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Sparkles className={`h-6 w-6 ${tool.theme.accent}`} />
              Get paid while you grow
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
              These tools are free and always will be. If you want to go further,
              4lo4lo pays you points for completing social tasks, teaches growth
              in the Classroom, and gives you a public profile you can put in
              your bio.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r ${tool.theme.gradient} px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02]`}
              >
                Create a free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/free-tools"
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
              >
                Browse all tools
              </Link>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold tracking-tight">More free tools</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((t) => {
                const RelIcon = ICONS[t.icon] ?? Activity;
                return (
                  <Link
                    key={t.slug}
                    href={toolHref(t)}
                    className={`group rounded-xl border bg-card p-5 transition-all ${t.theme.hover} hover:shadow-md`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${t.theme.gradient}`}
                    >
                      <RelIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="mt-3 font-semibold">{t.name}</div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {t.tagline}
                    </p>
                    <span
                      className={`mt-3 inline-flex items-center gap-1 text-sm font-medium ${t.theme.accent}`}
                    >
                      Open
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-16 border-t bg-muted/30">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} 4lo4lo</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/free-tools" className="hover:text-foreground">Free tools</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/support" className="hover:text-foreground">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** FAQPage JSON-LD, so the questions can surface directly in search results. */
export function faqJsonLd(faq: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
