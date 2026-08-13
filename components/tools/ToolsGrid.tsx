"use client";

import Link from "next/link";
import {
  Activity,
  Clock,
  Hash,
  PenLine,
  TrendingUp,
  Crop,
  QrCode,
  Link2,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { TOOLS, toolHref } from "@/lib/tools-registry";

/**
 * The full tool index, rendered on the /free-tools hub.
 *
 * Every tool page links back here and here links out to every tool, so the
 * whole set is reachable in one click from any entry point. That is how a
 * crawler finds the new pages, and how a visitor who landed on one tool
 * discovers the rest.
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

export function ToolsGrid({
  excludeSlug,
  heading = "Every free tool",
  subheading = "No signup, no limits, no watermarks. Built for creators who would rather spend the money on something else.",
}: {
  excludeSlug?: string;
  heading?: string;
  subheading?: string;
}) {
  const tools = TOOLS.filter((t) => t.slug !== excludeSlug);

  return (
    <section id="all-tools" className="mt-14 scroll-mt-20">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:from-purple-950/60 dark:to-pink-950/60 dark:text-purple-300">
            <Sparkles className="h-3.5 w-3.5" />
            {tools.length} free tools
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {heading}
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {subheading}
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = ICONS[tool.icon] ?? Activity;
          return (
            <Link
              key={tool.slug}
              href={toolHref(tool)}
              className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 dark:border-gray-700 dark:bg-gray-800 ${tool.theme.hover} hover:-translate-y-0.5 hover:shadow-xl`}
            >
              {/* Colour wash that intensifies on hover */}
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${tool.theme.gradient} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
              />

              <div className="relative">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.theme.gradient} shadow-md transition-transform duration-200 group-hover:scale-105`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="mt-4 font-semibold text-foreground">
                  {tool.name}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {tool.tagline}
                </p>

                <span
                  className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${tool.theme.accent}`}
                >
                  Open tool
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
