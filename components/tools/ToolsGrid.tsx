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
  type LucideIcon,
} from "lucide-react";
import { TOOLS, toolHref } from "@/lib/tools-registry";

/**
 * The full tool index, rendered on the /free-tools hub.
 *
 * Every tool page links back here and here links out to every tool, so the
 * whole set is reachable in one click from any entry point — which is how a
 * crawler finds the new pages and how a visitor who landed on one tool
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

export function ToolsGrid({ excludeSlug }: { excludeSlug?: string }) {
  const tools = TOOLS.filter((t) => t.slug !== excludeSlug);

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Every free tool
      </h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        No signup, no limits. Built for creators who would rather spend the money
        on something else.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = ICONS[tool.icon] ?? Activity;
          return (
            <Link
              key={tool.slug}
              href={toolHref(tool)}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
                {tool.name}
              </h3>
              <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                {tool.tagline}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-600 dark:text-purple-400">
                Open
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
