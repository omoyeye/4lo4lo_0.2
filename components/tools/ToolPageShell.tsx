import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { otherTools, toolHref, type ToolDefinition } from "@/lib/tools-registry";

/**
 * Shared chrome for a public tool page.
 *
 * A server component on purpose: the explainer, FAQ and cross-links are the
 * part search engines read, so they must be in the server-rendered HTML. Only
 * the interactive widget passed as `children` is a client component.
 */

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
  /** Long-form body copy — this is what gives the page something to rank on. */
  explainer: ReactNode;
  faq: FaqItem[];
}) {
  const related = otherTools(tool.slug, 3);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            4LO4LO
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Join free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link href="/free-tools" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            All free tools
          </Link>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{tool.name}</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">{intro}</p>

        <div className="mt-8">{children}</div>

        <section className="prose prose-neutral dark:prose-invert mt-14 max-w-none">
          {explainer}
        </section>

        {faq.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight">
              Frequently asked questions
            </h2>
            <dl className="mt-6 space-y-6">
              {faq.map((item) => (
                <div key={item.question}>
                  <dt className="font-medium">{item.question}</dt>
                  <dd className="mt-1.5 text-muted-foreground">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-14 rounded-xl border bg-card p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            Get paid while you grow
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            These tools are free and always will be. If you want to go further,
            4lo4lo pays you points for completing social tasks, teaches growth in
            the Classroom, and gives you a public profile you can put in your bio.
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Create a free account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-semibold tracking-tight">More free tools</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((t) => (
                <Link
                  key={t.slug}
                  href={toolHref(t)}
                  className="rounded-lg border p-4 transition-colors hover:border-primary/50 hover:bg-accent"
                >
                  <div className="font-medium">{t.name}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-16 border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} 4lo4lo</p>
          <div className="flex gap-4">
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
