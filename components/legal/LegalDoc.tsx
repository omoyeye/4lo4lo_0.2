import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { LEGAL_UPDATED, type Block, type LegalSection } from "@/lib/legal-content";

function slug(title: string) {
  return title.toLowerCase().replace(/^\d+\.\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ("p" in b) return <p key={i}>{b.p}</p>;
        if ("h" in b)
          return (
            <h3 key={i} className="mt-5 text-base font-semibold text-foreground">
              {b.h}
            </h3>
          );
        if ("list" in b)
          return (
            <ul key={i} className="list-disc space-y-2 pl-5">
              {b.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        return (
          <div key={i} className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/40 dark:bg-rose-950/20">
            <p className="mb-3 flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" /> {b.title}
            </p>
            <div className="space-y-3">
              <Blocks blocks={b.blocks} />
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Shared layout for the Terms and Privacy pages, with a table of contents. */
export default function LegalDoc({ title, intro, sections, other }: { title: string; intro: string; sections: LegalSection[]; other: { href: string; label: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/60 to-background px-4 py-10 dark:from-purple-950/10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            ← Back to Home
          </Link>
          <Link href={other.href} className="text-sm text-muted-foreground hover:text-foreground">
            {other.label}
          </Link>
        </div>

        <header className="mb-8 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-600 p-8 text-white shadow-lg">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-white/85">{intro}</p>
          <p className="mt-4 text-sm font-medium text-white/80">Last updated: {LEGAL_UPDATED}</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Contents" className="hidden lg:block">
            <div className="sticky top-6 space-y-1 text-sm">
              <p className="mb-2 font-semibold text-foreground">Contents</p>
              {sections.map((s) => (
                <a key={s.title} href={`#${slug(s.title)}`} className="block rounded-lg px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  {s.title}
                </a>
              ))}
            </div>
          </nav>

          <article className="space-y-8 rounded-3xl border bg-card p-6 text-[15px] leading-relaxed text-muted-foreground shadow-sm sm:p-10">
            {sections.map((s) => (
              <section key={s.title} id={slug(s.title)} className="scroll-mt-6 space-y-3">
                <h2 className="text-xl font-bold text-foreground">{s.title}</h2>
                <Blocks blocks={s.blocks} />
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}
