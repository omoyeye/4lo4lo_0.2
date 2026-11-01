"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/layout/Sidebar";
import DesktopTopBar from "@/components/layout/DesktopTopBar";
import Footer from "@/components/layout/Footer";

/**
 * Shared building blocks for the member pages (dashboard, tasks, rewards...),
 * so every page has the same frame, header, spacing and card style.
 */

/** Sidebar + top bar + centred content column + footer. */
export function MemberLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-purple-50/40 via-background to-background text-foreground dark:from-purple-950/10 md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <DesktopTopBar />
        <main className={cn("mx-auto w-full flex-1 space-y-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8", wide ? "max-w-7xl" : "max-w-6xl")}>{children}</main>
        <Footer />
      </div>
    </div>
  );
}

const TONES = {
  purple: "from-purple-600 to-fuchsia-600",
  pink: "from-pink-500 to-rose-500",
  emerald: "from-emerald-500 to-teal-500",
  amber: "from-amber-500 to-orange-500",
  sky: "from-sky-500 to-blue-600",
  slate: "from-slate-600 to-slate-800",
} as const;
export type Tone = keyof typeof TONES;

/** Page title row: gradient icon tile, title, one-line explanation, optional actions. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  tone = "purple",
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg shadow-purple-500/20", TONES[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-[1.7rem]">{title}</h1>
          {description && <p className="text-sm text-muted-foreground md:text-[15px]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** White card with optional title row. */
export function Section({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Small metric tile. Pass href to make it a link. */
export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "purple",
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  hint?: ReactNode;
  href?: string;
}) {
  const body = (
    <div className={cn("flex h-full items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all", href && "hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md dark:hover:border-purple-800")}>
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white", TONES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/15 to-pink-500/15 text-purple-600 dark:text-purple-400">
        <Icon className="h-7 w-7" />
      </div>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Horizontal, scrollable pill filter. */
export function Pills<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto rounded-xl bg-muted/60 p-1 scrollbar-hide", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
          {typeof o.count === "number" && (
            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", value === o.value ? "bg-purple-500/10 text-purple-700 dark:text-purple-300" : "bg-muted")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
