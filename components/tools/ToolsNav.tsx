"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  Clock,
  Hash,
  PenLine,
  TrendingUp,
  Crop,
  QrCode,
  Link2,
  Menu,
  X,
  Wrench,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { TOOLS, toolHref } from "@/lib/tools-registry";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * Sticky header for the tool pages.
 *
 * Every tool is reachable from every other tool without going back to the hub.
 * That matters twice over: a visitor who arrived from search on one keyword
 * discovers the rest of the set, and crawlers find all eight pages from any
 * single entry point.
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

export function ToolsNav({ activeSlug }: { activeSlug?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <BrandLogo priority />

        <Link
          href="/free-tools"
          className="hidden items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium md:inline-flex"
        >
          <Wrench className="h-3.5 w-3.5" />
          Free tools
        </Link>

        <Link
          href="/learn"
          className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Learn
        </Link>

        {/* Desktop tool strip */}
        <nav aria-label="Free tools" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {TOOLS.slice(0, 6).map((tool) => {
              const Icon = ICONS[tool.icon] ?? Activity;
              const isActive = tool.slug === activeSlug;
              return (
                <li key={tool.slug}>
                  <Link
                    href={toolHref(tool)}
                    aria-current={isActive ? "page" : undefined}
                    title={tool.name}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? `bg-gradient-to-br ${tool.theme.gradient} text-white`
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="sr-only">{tool.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          <Link
            href="/signup"
            className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.03]"
          >
            Join free
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close tools menu" : "Open tools menu"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet tool list */}
      {open && (
        <nav aria-label="Free tools" className="border-t lg:hidden">
          <ul className="mx-auto grid max-w-5xl gap-1 px-4 py-3 sm:grid-cols-2">
            {TOOLS.map((tool) => {
              const Icon = ICONS[tool.icon] ?? Activity;
              const isActive = tool.slug === activeSlug;
              return (
                <li key={tool.slug}>
                  <Link
                    href={toolHref(tool)}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isActive ? "bg-accent font-medium" : "hover:bg-accent"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tool.theme.gradient}`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </span>
                    {tool.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
