"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, Inbox, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/*
 * Shared building blocks for the admin panel, so every section has the same
 * header, cards, empty states and confirmations instead of each one inventing
 * its own.
 */

export const PLATFORM_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "twitter", label: "Twitter/X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "snapchat", label: "Snapchat" },
  { value: "pinterest", label: "Pinterest" },
  { value: "discord", label: "Discord" },
  { value: "threads", label: "Threads" },
  { value: "google_review", label: "Google Review" },
  { value: "survey", label: "Survey" },
] as const;

export const TASK_TYPE_OPTIONS = [
  { value: "follow", label: "Follow" },
  { value: "like", label: "Like" },
  { value: "comment", label: "Comment" },
  { value: "share", label: "Share" },
  { value: "view", label: "View" },
  { value: "subscribe", label: "Subscribe" },
  { value: "review", label: "Review" },
  { value: "survey", label: "Survey" },
] as const;

export const platformLabel = (p: string | null | undefined) =>
  PLATFORM_OPTIONS.find((o) => o.value === p)?.label ?? (p ? p.charAt(0).toUpperCase() + p.slice(1) : "Other");

/* ───────────────────────── Layout ───────────────────────── */

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h3 className="font-semibold">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

const TONES = {
  purple: "from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400",
  pink: "from-pink-500/15 to-pink-500/5 text-pink-600 dark:text-pink-400",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
  sky: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400",
  rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400",
} as const;

export type Tone = keyof typeof TONES;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "purple",
  hint,
  loading,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  hint?: ReactNode;
  loading?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-2xl border bg-card p-5 text-left shadow-sm transition-all",
        onClick && "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
          {loading ? <span className="inline-block h-8 w-20 animate-pulse rounded-md bg-muted" /> : value}
        </div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br", TONES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
    </Comp>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 4, height = "h-14" }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn("animate-pulse rounded-xl bg-muted/70", height)} />
      ))}
    </div>
  );
}

/* ───────────────────────── Status ───────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400",
  in_progress: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-400",
  approved: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-400",
  completed: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  verified: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  paid: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  active: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  open: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  scheduled: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-400",
  inactive: "bg-muted text-muted-foreground ring-border",
  sold: "bg-muted text-muted-foreground ring-border",
  cancelled: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-400",
  rejected: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-400",
  failed: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-400",
  unpaid: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const key = (status || "").toLowerCase();
  const text = label ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[key] ?? "bg-muted text-muted-foreground ring-border"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {text}
    </span>
  );
}

export function RoleBadge({ role }: { role: string | null | undefined }) {
  const r = role || "member";
  const style =
    r === "superadmin"
      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white ring-transparent"
      : r === "admin"
        ? "bg-purple-500/10 text-purple-700 ring-purple-500/20 dark:text-purple-300"
        : r === "deleted"
          ? "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-400"
          : "bg-muted text-muted-foreground ring-border";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset", style)}>
      {r}
    </span>
  );
}

export function UserAvatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const initials = (name || "?").slice(0, 2).toUpperCase();
  if (src) {
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-background" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 font-semibold text-purple-700 ring-2 ring-background dark:text-purple-300"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

/* ───────────────────────── Toolbar & paging ───────────────────────── */

export function SearchInput({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 rounded-xl pl-9" />
    </div>
  );
}

export function FilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl bg-muted/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
          {typeof o.count === "number" && (
            <span className={cn("ml-1.5 rounded-full px-1.5 text-xs tabular-nums", value === o.value ? "bg-primary/10 text-primary" : "bg-muted")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function usePagination<T>(items: T[], pageSize = 15) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const pageItems = useMemo(() => items.slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize]);
  return { page: current, setPage, pageCount, pageItems, total: items.length, pageSize };
}

export function Pager({ page, pageCount, setPage, total, pageSize }: { page: number; pageCount: number; setPage: (p: number) => void; total: number; pageSize: number }) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 tabular-nums">
          {page} / {pageCount}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pageCount} onClick={() => setPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────── Confirm ───────────────────────── */

interface ConfirmState {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<unknown>;
}

/**
 * Replaces window.confirm() with an accessible dialog.
 *   const { confirm, dialog } = useConfirm();
 *   confirm({ title: "Delete?", onConfirm: () => ... });  and render {dialog}
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);

  const dialog = (
    <AlertDialog open={!!state} onOpenChange={(open) => !open && !busy && setState(null)}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          {state?.description && <AlertDialogDescription>{state.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className={cn(state?.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            onClick={async (e) => {
              e.preventDefault();
              if (!state) return;
              setBusy(true);
              try {
                await state.onConfirm();
              } finally {
                setBusy(false);
                setState(null);
              }
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {state?.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm: (s: ConfirmState) => setState(s), dialog };
}

/* ───────────────────────── Fetch helper ───────────────────────── */

export async function adminFetch<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    credentials: "include",
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && typeof data.message === "string" && data.message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}
